"""Category CRUD and insights endpoints."""

from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import ExpenseCategory, User, VariableExpense
from app.schemas import (
    CategoryCreate,
    CategoryRead,
    CategoryUpdate,
    DailyNotificationRead,
    InsightsRead,
)
from app.services.budget import compute_summary, month_bounds, today_in_app_timezone
from app.services.categories import seed_default_categories
from app.services.insights import compute_insights
from app.services.notification_message import pick_daily_notification

categories_router = APIRouter(prefix="/api/categories", tags=["categories"])
insights_router = APIRouter(prefix="/api/insights", tags=["insights"])


def _get_category_or_404(
    db: Session, category_id: int, user_id: int
) -> ExpenseCategory:
    row = db.get(ExpenseCategory, category_id)
    if row is None or row.user_id != user_id:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return row


# --- Category CRUD ------------------------------------------------------------


@categories_router.get("", response_model=list[CategoryRead])
def list_categories(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ExpenseCategory]:
    """List all categories for the authenticated user (defaults first)."""
    stmt = (
        select(ExpenseCategory)
        .where(ExpenseCategory.user_id == user.id)
        .order_by(ExpenseCategory.is_default.desc(), ExpenseCategory.name)
    )
    return list(db.scalars(stmt).all())


@categories_router.post("", response_model=CategoryRead, status_code=201)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ExpenseCategory:
    """Create a custom category."""
    row = ExpenseCategory(
        user_id=user.id,
        name=payload.name,
        color=payload.color,
        icon=payload.icon,
        monthly_budget=payload.monthly_budget,
        is_default=False,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@categories_router.patch("/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ExpenseCategory:
    """Update a category (built-in or custom)."""
    row = _get_category_or_404(db, category_id, user.id)
    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates:
        row.name = updates["name"]
    if "color" in updates:
        row.color = updates["color"]
    if "icon" in updates:
        row.icon = updates["icon"]
    if "monthly_budget" in updates:
        row.monthly_budget = updates["monthly_budget"]
    db.commit()
    db.refresh(row)
    return row


@categories_router.delete("/{category_id}", status_code=204)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    """Delete a category. Expenses linked to it will have category_id set to NULL."""
    row = _get_category_or_404(db, category_id, user.id)
    db.delete(row)
    db.commit()


# --- Insights -----------------------------------------------------------------


@insights_router.get("", response_model=InsightsRead)
def read_insights(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    year: int | None = Query(default=None, ge=2000, le=3000),
    month: int | None = Query(default=None, ge=1, le=12),
) -> InsightsRead:
    """Return spending analysis and actionable insights for the given month."""
    ref = today_in_app_timezone()
    y = year if year is not None else ref.year
    m = month if month is not None else ref.month
    start, end = month_bounds(date(y, m, 1))
    data = compute_insights(db, user.id, start, end)
    return InsightsRead(**data)


@insights_router.get("/daily-notification", response_model=DailyNotificationRead | None)
def read_daily_notification(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DailyNotificationRead | None:
    """Return one positive notification message for today, or null if none."""
    today = today_in_app_timezone()
    start, end = month_bounds(today)
    summary = compute_summary(db, user.id, today)
    insights_data = compute_insights(db, user.id, start, end, summary=summary)
    payload = pick_daily_notification(insights_data, summary)
    if payload is None:
        return None
    return DailyNotificationRead(**payload)
