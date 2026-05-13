"""Budget computation (no HTTP layer).

The single useful entry point is ``compute_summary``, which combines the
user's settings, fixed expenses and variable expenses for the month into
the numbers shown on the dashboard. ``today_in_app_timezone`` lives here
too because it is used exclusively from the budget routes.
"""

import calendar
from datetime import date, datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import ExtraIncome, FixedExpense, UserSettings, VariableExpense


def _sum_amount_in_month(
    session: Session,
    model_cls: type,
    user_id: int,
    date_column,
    month_start: date,
    month_end: date,
) -> Decimal:
    raw = session.scalar(
        select(func.coalesce(func.sum(model_cls.amount), 0)).where(
            model_cls.user_id == user_id,
            date_column >= month_start,
            date_column <= month_end,
        )
    ) or Decimal("0")
    return Decimal(raw).quantize(Decimal("0.01"))


def today_in_app_timezone() -> date:
    """Return today's date in the timezone configured via ``TIMEZONE``."""
    return datetime.now(ZoneInfo(settings.timezone)).date()


def month_bounds(reference: date) -> tuple[date, date]:
    """Return (first_day, last_day) of the month containing ``reference``."""
    last_day = calendar.monthrange(reference.year, reference.month)[1]
    start = date(reference.year, reference.month, 1)
    end = date(reference.year, reference.month, last_day)
    return start, end


def days_remaining_in_month(reference: date) -> int:
    """Number of days from ``reference`` (inclusive) to month end."""
    _, end = month_bounds(reference)
    return (end - reference).days + 1


def compute_summary(session: Session, user_id: int, reference: date) -> dict:
    """Return today's budget snapshot for ``user_id``.

    Resolves savings according to ``UserSettings.savings_mode``,
    aggregates fixed and variable expenses for the month, and divides
    the remainder by the days left to suggest a daily ceiling.
    """
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
    fixed_savings = us.savings_amount

    # Ahorro efectivo segun el modo elegido por el usuario.
    # Capamos a [0, income] para no generar presupuestos negativos por
    # un "fijo" mayor que el ingreso (caso accidental).
    if us.savings_mode == "fixed":
        savings_amount = max(Decimal("0"), min(fixed_savings, income))
    else:
        savings_amount = (income * pct / Decimal("100"))
    savings_amount = savings_amount.quantize(Decimal("0.01"))

    month_start, month_end = month_bounds(reference)

    # Single query for all aggregates (fixed, variable, extra income)
    fixed_total = session.scalar(
        select(func.coalesce(func.sum(FixedExpense.amount), 0)).where(
            FixedExpense.user_id == user_id
        )
    ) or Decimal("0")
    fixed_total = Decimal(fixed_total).quantize(Decimal("0.01"))

    variable_spent = _sum_amount_in_month(
        session,
        VariableExpense,
        user_id,
        VariableExpense.occurred_at,
        month_start,
        month_end,
    )
    extra_month = _sum_amount_in_month(
        session,
        ExtraIncome,
        user_id,
        ExtraIncome.received_at,
        month_start,
        month_end,
    )

    # Ingreso efectivo del mes: sueldo base + extras recibidos en el mes.
    # El ahorro (porcentaje o fijo) sigue calculandose solo sobre el sueldo base.
    effective_income = income + extra_month

    monthly_budget = effective_income - savings_amount - fixed_total
    remaining = monthly_budget - variable_spent

    days_left = days_remaining_in_month(reference)
    divisor = Decimal(max(1, days_left))
    suggested = (remaining / divisor).quantize(Decimal("0.01"))

    return {
        "reference_date": reference,
        "days_remaining_in_month": days_left,
        "monthly_income": income.quantize(Decimal("0.01")),
        "extra_income_month": extra_month,
        "savings_mode": us.savings_mode,
        "savings_percent": pct.quantize(Decimal("0.01")),
        "savings_amount": savings_amount,
        "fixed_expenses_total": fixed_total,
        "variable_spent_month": variable_spent,
        "monthly_budget_after_fixed_and_savings": monthly_budget.quantize(Decimal("0.01")),
        "remaining_this_month": remaining.quantize(Decimal("0.01")),
        "suggested_spend_today": suggested,
    }
