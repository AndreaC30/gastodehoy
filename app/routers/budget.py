"""Budget API: settings, summary, fixed expenses and day-to-day expenses.

All four concerns share the same domain (per-user budget) and the same
auth dependency, so they live in a single module to keep the surface
small and make endpoints easy to find.
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import FixedExpense, User, UserSettings, VariableExpense
from app.schemas import (
    BudgetSettings,
    FixedExpenseCreate,
    FixedExpenseRead,
    FixedExpenseUpdate,
    SummaryRead,
    VariableExpenseCreate,
    VariableExpenseRead,
)
from app.services.budget import compute_summary, month_bounds, today_in_app_timezone

# One router per HTTP prefix. They are all included from app.main as
# part of the same logical "budget" surface.
settings_router = APIRouter(prefix="/api", tags=["settings"])
summary_router = APIRouter(prefix="/api", tags=["summary"])
fixed_router = APIRouter(prefix="/api/fixed-expenses", tags=["fixed-expenses"])
expenses_router = APIRouter(prefix="/api/expenses", tags=["expenses"])


# --- Settings ----------------------------------------------------------------


def _get_or_create_settings(db: Session, user: User) -> UserSettings:
    """Return the user's settings row; lazily create defaults on first read."""
    if user.settings is None:
        row = UserSettings(user_id=user.id)
        db.add(row)
        db.commit()
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


@settings_router.put("/settings", response_model=BudgetSettings)
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
    db.commit()
    db.refresh(row)
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


# --- Fixed expenses ----------------------------------------------------------


@fixed_router.get("", response_model=list[FixedExpenseRead])
def list_fixed(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[FixedExpense]:
    """List the authenticated user's fixed expenses."""
    stmt = (
        select(FixedExpense)
        .where(FixedExpense.user_id == user.id)
        .order_by(FixedExpense.id)
    )
    return list(db.scalars(stmt).all())


@fixed_router.post("", response_model=FixedExpenseRead)
def create_fixed(
    payload: FixedExpenseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FixedExpense:
    """Add a new fixed expense for the authenticated user."""
    row = FixedExpense(user_id=user.id, name=payload.name, amount=payload.amount)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@fixed_router.patch("/{expense_id}", response_model=FixedExpenseRead)
def update_fixed(
    expense_id: int,
    payload: FixedExpenseUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FixedExpense:
    """Patch ``name`` and/or ``amount``; 404 if the row belongs to another user."""
    row = db.get(FixedExpense, expense_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Gasto fijo no encontrado")
    if payload.name is None and payload.amount is None:
        raise HTTPException(status_code=400, detail="Nada que actualizar")
    if payload.name is not None:
        row.name = payload.name
    if payload.amount is not None:
        row.amount = payload.amount
    db.commit()
    db.refresh(row)
    return row


@fixed_router.delete("/{expense_id}", status_code=204)
def delete_fixed(
    expense_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    """Delete a fixed expense; 404 if it belongs to another user."""
    row = db.get(FixedExpense, expense_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Gasto fijo no encontrado")
    db.delete(row)
    db.commit()


# --- Variable (day-to-day) expenses ------------------------------------------


@expenses_router.get("", response_model=list[VariableExpenseRead])
def list_expenses(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    year: int | None = Query(default=None, ge=2000, le=3000),
    month: int | None = Query(default=None, ge=1, le=12),
) -> list[VariableExpense]:
    """List expenses for the given (or current) month, newest first."""
    ref = today_in_app_timezone()
    y = year if year is not None else ref.year
    m = month if month is not None else ref.month
    start, end = month_bounds(date(y, m, 1))
    stmt = (
        select(VariableExpense)
        .where(
            VariableExpense.user_id == user.id,
            VariableExpense.occurred_at >= start,
            VariableExpense.occurred_at <= end,
        )
        .order_by(VariableExpense.occurred_at.desc(), VariableExpense.id.desc())
    )
    return list(db.scalars(stmt).all())


@expenses_router.post("", response_model=VariableExpenseRead)
def create_expense(
    payload: VariableExpenseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> VariableExpense:
    """Register an expense; defaults the date to today in app TZ."""
    day = payload.occurred_at or today_in_app_timezone()
    row = VariableExpense(
        user_id=user.id,
        amount=payload.amount,
        occurred_at=day,
        note=payload.note,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@expenses_router.delete("/{expense_id}", status_code=204)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    """Delete an expense; 404 if it belongs to another user."""
    row = db.get(VariableExpense, expense_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    db.delete(row)
    db.commit()
