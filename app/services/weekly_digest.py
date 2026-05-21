"""Weekly digest payload for optional email notifications."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import User, VariableExpense
from app.services.budget import compute_summary, today_in_app_timezone


def _sum_variable_between(
    session: Session,
    user_id: int,
    start,
    end,
) -> Decimal:
    raw = session.scalar(
        select(func.coalesce(func.sum(VariableExpense.amount), 0)).where(
            VariableExpense.user_id == user_id,
            VariableExpense.occurred_at >= start,
            VariableExpense.occurred_at <= end,
        )
    ) or Decimal("0")
    return Decimal(raw).quantize(Decimal("0.01"))


def build_digest_for_user(session: Session, user: User) -> dict:
    """Build digest numbers for the last 7 days and current month snapshot."""
    today = today_in_app_timezone()
    week_start = today - timedelta(days=6)
    weekly_spent = _sum_variable_between(session, user.id, week_start, today)
    snap = compute_summary(session, user.id, today)

    return {
        "reference_date": today,
        "week_start": week_start,
        "week_end": today,
        "weekly_variable_spent": weekly_spent,
        "remaining_this_month": snap["remaining_this_month"],
        "savings_amount": snap["savings_amount"],
        "variable_spent_month": snap["variable_spent_month"],
    }
