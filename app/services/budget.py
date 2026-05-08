import calendar
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import FixedExpense, UserSettings, VariableExpense


def month_bounds(reference: date) -> tuple[date, date]:
    last_day = calendar.monthrange(reference.year, reference.month)[1]
    start = date(reference.year, reference.month, 1)
    end = date(reference.year, reference.month, last_day)
    return start, end


def days_remaining_in_month(reference: date) -> int:
    _, end = month_bounds(reference)
    return (end - reference).days + 1


def compute_summary(session: Session, user_id: int, reference: date) -> dict:
    us = session.scalar(
        select(UserSettings).where(UserSettings.user_id == user_id)
    )
    if us is None:
        us = UserSettings(user_id=user_id)
        session.add(us)
        session.commit()
        session.refresh(us)

    income = us.monthly_income
    pct = us.savings_percent
    savings_amount = (income * pct / Decimal("100")).quantize(Decimal("0.01"))

    fixed_total = session.scalar(
        select(func.coalesce(func.sum(FixedExpense.amount), 0)).where(
            FixedExpense.user_id == user_id
        )
    ) or Decimal("0")
    fixed_total = Decimal(fixed_total).quantize(Decimal("0.01"))

    month_start, month_end = month_bounds(reference)
    variable_spent = session.scalar(
        select(func.coalesce(func.sum(VariableExpense.amount), 0)).where(
            VariableExpense.user_id == user_id,
            VariableExpense.occurred_at >= month_start,
            VariableExpense.occurred_at <= month_end,
        )
    ) or Decimal("0")
    variable_spent = Decimal(variable_spent).quantize(Decimal("0.01"))

    monthly_budget = income - savings_amount - fixed_total
    remaining = monthly_budget - variable_spent

    days_left = days_remaining_in_month(reference)
    divisor = Decimal(max(1, days_left))
    suggested = (remaining / divisor).quantize(Decimal("0.01"))

    return {
        "reference_date": reference,
        "days_remaining_in_month": days_left,
        "monthly_income": income.quantize(Decimal("0.01")),
        "savings_percent": pct.quantize(Decimal("0.01")),
        "savings_amount": savings_amount,
        "fixed_expenses_total": fixed_total,
        "variable_spent_month": variable_spent,
        "monthly_budget_after_fixed_and_savings": monthly_budget.quantize(Decimal("0.01")),
        "remaining_this_month": remaining.quantize(Decimal("0.01")),
        "suggested_spend_today": suggested,
    }
