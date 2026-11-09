"""Budget API: settings, summary, fixed expenses and day-to-day expenses.

All four concerns share the same domain (per-user budget) and the same
auth dependency, so they live in a single module to keep the surface
small and make endpoints easy to find.
"""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import TypeVar

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.auth import get_current_user, limit_authenticated_writes
from app.database import get_db
from app.models import ExtraIncome, ExpenseCategory, FixedExpense, User, UserSettings, VariableExpense
from app.schemas import (
    BudgetSettings,
    ExtraIncomeCreate,
    ExtraIncomeRead,
    FixedExpenseCreate,
    FixedExpenseRead,
    FixedExpenseUpdate,
    LanguageUpdate,
    MonthHistoryRead,
    PaginatedMeta,
    PaginatedVariableExpenses,
    SummaryRead,
    VariableExpenseCreate,
    VariableExpenseRead,
    VariableExpenseUpdate,
)
from app.services.budget import compute_summary, month_bounds, today_in_app_timezone
from app.services.history import compute_month_history

# One router per HTTP prefix. They are all included from app.main as
# part of the same logical "budget" surface.
settings_router = APIRouter(prefix="/api", tags=["settings"])
summary_router = APIRouter(prefix="/api", tags=["summary"])
fixed_router = APIRouter(prefix="/api/fixed-expenses", tags=["fixed-expenses"])
expenses_router = APIRouter(prefix="/api/expenses", tags=["expenses"])
extra_income_router = APIRouter(prefix="/api/extra-income", tags=["extra-income"])

# A second identical variable expense inside this window is the same tap or retry.
EXPENSE_DUPLICATE_WINDOW = timedelta(seconds=8)

_Owned = TypeVar("_Owned")


def _get_owned_or_404(
    db: Session,
    model: type[_Owned],
    pk: int,
    user_id: int,
    detail: str,
) -> _Owned:
    row = db.get(model, pk)
    if row is None or row.user_id != user_id:  # type: ignore[attr-defined, union-attr]
        raise HTTPException(status_code=404, detail=detail)
    return row


def _calendar_month_bounds(year: int | None, month: int | None) -> tuple[date, date]:
    ref = today_in_app_timezone()
    y = year if year is not None else ref.year
    m = month if month is not None else ref.month
    return month_bounds(date(y, m, 1))


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _note_is_blank(note: str | None) -> bool:
    """Same empty treatment as ``VariableExpenseUpdate``: null and whitespace are absent."""
    return note is None or note.strip() == ""


def _find_recent_variable_expense(
    db: Session,
    user_id: int,
    *,
    amount: Decimal,
    occurred_at: date,
    note: str | None,
    category_id: int | None,
    now: datetime,
) -> VariableExpense | None:
    """Return a matching variable expense created inside the duplicate window."""
    cutoff = now - EXPENSE_DUPLICATE_WINDOW
    filters = [
        VariableExpense.user_id == user_id,
        VariableExpense.amount == amount,
        VariableExpense.occurred_at == occurred_at,
        VariableExpense.category_id == category_id,
        VariableExpense.created_at >= cutoff,
    ]
    if _note_is_blank(note):
        filters.append(
            or_(
                VariableExpense.note.is_(None),
                func.trim(VariableExpense.note) == "",
            )
        )
    else:
        filters.append(VariableExpense.note == note)
    stmt = (
        select(VariableExpense)
        .where(*filters)
        .order_by(VariableExpense.created_at.desc(), VariableExpense.id.desc())
        .limit(1)
    )
    return db.scalar(stmt)


# --- Settings ----------------------------------------------------------------


def _get_or_create_settings(db: Session, user: User) -> UserSettings:
    """Return the user's settings row; lazily create defaults on first read.

    Uses a try/except IntegrityError to handle the race where two concurrent
    requests both find ``user.settings is None`` and try to insert.
    """
    if user.settings is None:
        from sqlalchemy.exc import IntegrityError
        row = UserSettings(user_id=user.id)
        db.add(row)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            # Another request won the race — reload the relationship
            db.refresh(user)
            return user.settings
        db.refresh(row)
        return row
    return user.settings


@settings_router.get("/settings", response_model=BudgetSettings)
def read_settings(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> BudgetSettings:
    """Read the authenticated user's budget settings."""
    row = _get_or_create_settings(db, user)
    return BudgetSettings.model_validate(row)


@settings_router.put(
    "/settings",
    response_model=BudgetSettings,
    dependencies=[Depends(limit_authenticated_writes)],
)
def update_settings(
    payload: BudgetSettings,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> BudgetSettings:
    """Replace the user's budget settings (full upsert)."""
    row = _get_or_create_settings(db, user)
    row.monthly_income = payload.monthly_income
    row.savings_mode = payload.savings_mode
    row.savings_percent = payload.savings_percent
    row.savings_amount = payload.savings_amount
    if payload.dashboard_tour_completed:
        row.dashboard_tour_completed = True
    if payload.income_check_month:
        row.income_check_month = payload.income_check_month
    if payload.language is not None:
        row.language = payload.language
    db.commit()
    db.refresh(row)
    return BudgetSettings.model_validate(row)


@settings_router.put(
    "/settings/language",
    response_model=BudgetSettings,
    dependencies=[Depends(limit_authenticated_writes)],
)
def update_language(
    payload: LanguageUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> BudgetSettings:
    """Update only the user's language preference (cross-device sync)."""
    from app.services.categories import rename_default_categories
    
    lang = payload.language
    if lang not in ("es", "en", "de", "fr", None):
        raise HTTPException(status_code=400, detail="Idioma no soportado")
    row = _get_or_create_settings(db, user)
    row.language = lang
    db.commit()
    db.refresh(row)
    
    # Rename default categories to match the new language
    if lang:
        rename_default_categories(db, user.id, lang)
    
    return BudgetSettings.model_validate(row)


# --- Summary -----------------------------------------------------------------


@summary_router.get("/summary", response_model=SummaryRead)
def read_summary(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SummaryRead:
    """Return today's budget snapshot for the authenticated user."""
    data = compute_summary(db, user.id, today_in_app_timezone())
    return SummaryRead(**data)


@summary_router.get("/summary/history", response_model=MonthHistoryRead)
def read_summary_history(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    months: int = Query(default=3, ge=1, le=12),
) -> MonthHistoryRead:
    """Return budget snapshots for the last N calendar months (oldest first)."""
    items = compute_month_history(db, user.id, months=months)
    return MonthHistoryRead(months=items)


# --- Fixed expenses ----------------------------------------------------------


@fixed_router.get("", response_model=list[FixedExpenseRead])
def list_fixed(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: int = Query(default=200, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[FixedExpense]:
    """List the authenticated user's fixed expenses (paginated, returns array)."""
    stmt = (
        select(FixedExpense)
        .where(FixedExpense.user_id == user.id)
        .order_by(FixedExpense.id)
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(stmt).all())


@fixed_router.post(
    "",
    response_model=FixedExpenseRead,
    dependencies=[Depends(limit_authenticated_writes)],
)
def create_fixed(
    payload: FixedExpenseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FixedExpense:
    """Add a new fixed expense for the authenticated user."""
    row = FixedExpense(
        user_id=user.id,
        name=payload.name,
        amount=payload.amount,
        icon=payload.icon,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@fixed_router.patch(
    "/{expense_id}",
    response_model=FixedExpenseRead,
    dependencies=[Depends(limit_authenticated_writes)],
)
def update_fixed(
    expense_id: int,
    payload: FixedExpenseUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FixedExpense:
    """Patch ``name`` and/or ``amount``; 404 if the row belongs to another user."""
    row = _get_owned_or_404(
        db, FixedExpense, expense_id, user.id, "Gasto fijo no encontrado"
    )
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Nada que actualizar")
    if "name" in updates:
        row.name = updates["name"]
    if "amount" in updates:
        row.amount = updates["amount"]
    if "icon" in updates:
        row.icon = updates["icon"]
    db.commit()
    db.refresh(row)
    return row


@fixed_router.delete(
    "/{expense_id}",
    status_code=204,
    dependencies=[Depends(limit_authenticated_writes)],
)
def delete_fixed(
    expense_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    """Delete a fixed expense; 404 if it belongs to another user."""
    row = _get_owned_or_404(
        db, FixedExpense, expense_id, user.id, "Gasto fijo no encontrado"
    )
    db.delete(row)
    db.commit()


# --- Variable (day-to-day) expenses ------------------------------------------


@expenses_router.get("", response_model=PaginatedVariableExpenses)
def list_expenses(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    year: int | None = Query(default=None, ge=2000, le=3000),
    month: int | None = Query(default=None, ge=1, le=12),
    category_id: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> PaginatedVariableExpenses:
    """List expenses for the given (or current) calendar month, newest first."""
    start, end = _calendar_month_bounds(year, month)
    filters = [
        VariableExpense.user_id == user.id,
        VariableExpense.occurred_at >= start,
        VariableExpense.occurred_at <= end,
    ]
    if category_id is not None:
        filters.append(VariableExpense.category_id == category_id)

    total = (
        db.scalar(select(func.count()).select_from(VariableExpense).where(*filters))
        or 0
    )

    stmt = (
        select(
            VariableExpense,
            ExpenseCategory.name.label("category_name"),
            ExpenseCategory.color.label("category_color"),
            ExpenseCategory.icon.label("category_icon"),
        )
        .outerjoin(
            ExpenseCategory,
            and_(
                VariableExpense.category_id == ExpenseCategory.id,
                ExpenseCategory.user_id == user.id,
            ),
        )
        .where(*filters)
        .order_by(VariableExpense.occurred_at.desc(), VariableExpense.id.desc())
        .limit(limit)
        .offset(offset)
    )

    rows = db.execute(stmt).all()
    items: list[VariableExpenseRead] = []
    for row in rows:
        exp = row[0]
        exp.category_name = row.category_name
        exp.category_color = row.category_color
        exp.category_icon = row.category_icon
        items.append(VariableExpenseRead.model_validate(exp))

    return PaginatedVariableExpenses(
        items=items,
        meta=PaginatedMeta(total=total, limit=limit, offset=offset),
    )


@expenses_router.post(
    "",
    response_model=VariableExpenseRead,
    dependencies=[Depends(limit_authenticated_writes)],
)
def create_expense(
    payload: VariableExpenseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> VariableExpense:
    """Register an expense; defaults the date to today in app TZ."""
    if payload.category_id is not None:
        cat = db.get(ExpenseCategory, payload.category_id)
        if cat is None or cat.user_id != user.id:
            raise HTTPException(
                status_code=400,
                detail="Categoría inválida o no pertenece a tu cuenta",
            )
    day = payload.occurred_at or today_in_app_timezone()
    now = _utcnow()
    existing = _find_recent_variable_expense(
        db,
        user.id,
        amount=payload.amount,
        occurred_at=day,
        note=payload.note,
        category_id=payload.category_id,
        now=now,
    )
    if existing is not None:
        return existing
    row = VariableExpense(
        user_id=user.id,
        amount=payload.amount,
        occurred_at=day,
        note=payload.note,
        category_id=payload.category_id,
        created_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@expenses_router.patch(
    "/{expense_id}",
    response_model=VariableExpenseRead,
    dependencies=[Depends(limit_authenticated_writes)],
)
def update_expense(
    expense_id: int,
    payload: VariableExpenseUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> VariableExpense:
    """Patch amount, date, note and/or category; 404 if not owned by user."""
    row = _get_owned_or_404(
        db, VariableExpense, expense_id, user.id, "Gasto no encontrado"
    )
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Nada que actualizar")
    if "category_id" in updates:
        cid = updates["category_id"]
        if cid is not None:
            cat = db.get(ExpenseCategory, cid)
            if cat is None or cat.user_id != user.id:
                raise HTTPException(
                    status_code=400,
                    detail="Categoría inválida o no pertenece a tu cuenta",
                )
        row.category_id = cid
    if "amount" in updates:
        row.amount = updates["amount"]
    if "occurred_at" in updates:
        row.occurred_at = updates["occurred_at"]
    if "note" in updates:
        row.note = updates["note"]
    db.commit()
    db.refresh(row)
    return row


@expenses_router.delete(
    "/{expense_id}",
    status_code=204,
    dependencies=[Depends(limit_authenticated_writes)],
)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    """Delete an expense; 404 if it belongs to another user."""
    row = _get_owned_or_404(
        db, VariableExpense, expense_id, user.id, "Gasto no encontrado"
    )
    db.delete(row)
    db.commit()


# --- Extra income (dated bonuses / irregular payroll) -------------------------


@extra_income_router.get("", response_model=list[ExtraIncomeRead])
def list_extra_income(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    year: int | None = Query(default=None, ge=2000, le=3000),
    month: int | None = Query(default=None, ge=1, le=12),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[ExtraIncome]:
    """List extra income rows for the given (or current) calendar month (paginated)."""
    start, end = _calendar_month_bounds(year, month)
    stmt = (
        select(ExtraIncome)
        .where(
            ExtraIncome.user_id == user.id,
            ExtraIncome.received_at >= start,
            ExtraIncome.received_at <= end,
        )
        .order_by(ExtraIncome.received_at.desc(), ExtraIncome.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(stmt).all())


@extra_income_router.post(
    "",
    response_model=ExtraIncomeRead,
    dependencies=[Depends(limit_authenticated_writes)],
)
def create_extra_income(
    payload: ExtraIncomeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ExtraIncome:
    """Register extra income; defaults the date to today in app TZ."""
    day = payload.received_at or today_in_app_timezone()
    row = ExtraIncome(
        user_id=user.id,
        amount=payload.amount,
        received_at=day,
        savings_mode=payload.savings_mode,
        savings_percent=payload.savings_percent,
        savings_fixed=payload.savings_fixed,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@extra_income_router.delete(
    "/{entry_id}",
    status_code=204,
    dependencies=[Depends(limit_authenticated_writes)],
)
def delete_extra_income(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    """Delete an extra-income row; 404 if it belongs to another user."""
    row = _get_owned_or_404(
        db, ExtraIncome, entry_id, user.id, "Ingreso extra no encontrado"
    )
    db.delete(row)
    db.commit()
