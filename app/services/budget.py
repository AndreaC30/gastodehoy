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

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import ExtraIncome, FixedExpense, UserSettings, VariableExpense
from app.money import cents_to_euros, percent_of_cents, sum_column_cents, to_cents
from app.services.extra_income_savings import saved_cents, spendable_cents


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
        from sqlalchemy.exc import IntegrityError
        us = UserSettings(user_id=user_id)
        session.add(us)
        try:
            session.commit()
        except IntegrityError:
            session.rollback()
            # Another request won the race — reload what it committed
            us = session.scalar(
                select(UserSettings).where(UserSettings.user_id == user_id)
            )
            if us is None:
                raise RuntimeError(
                    f"Failed to create or retrieve UserSettings for user_id={user_id}"
                )
        else:
            session.refresh(us)

    income_cents = to_cents(us.monthly_income)
    pct = us.savings_percent

    # Ahorro efectivo segun el modo elegido por el usuario.
    # Capamos a [0, income] para no generar presupuestos negativos por
    # un "fijo" mayor que el ingreso (caso accidental).
    if us.savings_mode == "fixed":
        savings_cents = max(0, min(to_cents(us.savings_amount), income_cents))
    else:
        savings_cents = percent_of_cents(income_cents, pct)

    month_start, month_end = month_bounds(reference)

    fixed_cents = sum_column_cents(
        session, FixedExpense.amount, FixedExpense.user_id == user_id
    )
    variable_cents = sum_column_cents(
        session,
        VariableExpense.amount,
        VariableExpense.user_id == user_id,
        VariableExpense.occurred_at >= month_start,
        VariableExpense.occurred_at <= month_end,
    )
    extra_rows = list(
        session.scalars(
            select(ExtraIncome).where(
                ExtraIncome.user_id == user_id,
                ExtraIncome.received_at >= month_start,
                ExtraIncome.received_at <= month_end,
            )
        ).all()
    )
    extra_cents = sum(to_cents(row.amount) for row in extra_rows)
    extra_saved_cents = sum(saved_cents(row) for row in extra_rows)
    extra_spendable_cents = sum(spendable_cents(row) for row in extra_rows)

    # Ingreso efectivo: sueldo base + parte de extras no reservada como ahorro.
    # El ahorro del sueldo (porcentaje o fijo) sigue solo sobre el ingreso mensual.
    budget_cents = income_cents + extra_spendable_cents - savings_cents - fixed_cents
    remaining_cents = budget_cents - variable_cents

    days_left = days_remaining_in_month(reference)
    divisor = Decimal(max(1, days_left))
    suggested = (Decimal(remaining_cents) / Decimal(100) / divisor).quantize(
        Decimal("0.01")
    )

    return {
        "reference_date": reference,
        "days_remaining_in_month": days_left,
        "monthly_income": cents_to_euros(income_cents),
        "extra_income_month": cents_to_euros(extra_cents),
        "extra_income_saved_month": cents_to_euros(extra_saved_cents),
        "savings_mode": us.savings_mode,
        "savings_percent": pct.quantize(Decimal("0.01")),
        "savings_amount": cents_to_euros(savings_cents),
        "fixed_expenses_total": cents_to_euros(fixed_cents),
        "variable_spent_month": cents_to_euros(variable_cents),
        "monthly_budget_after_fixed_and_savings": cents_to_euros(budget_cents),
        "remaining_this_month": cents_to_euros(remaining_cents),
        "suggested_spend_today": suggested,
    }
