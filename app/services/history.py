"""Monthly history snapshots for dashboard comparisons."""

from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.services.budget import compute_summary, month_bounds, today_in_app_timezone

_MONTH_LABELS = (
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
)


def _shift_month(year: int, month: int, delta: int) -> tuple[int, int]:
    """Return (year, month) ``delta`` months before (negative) or after (positive)."""
    idx = year * 12 + (month - 1) + delta
    return idx // 12, (idx % 12) + 1


def _reference_for_month(year: int, month: int, today: date) -> date:
    """Use today when it's the current month, else the month's last day."""
    if year == today.year and month == today.month:
        return today
    _, end = month_bounds(date(year, month, 1))
    return end


def compute_month_history(
    session: Session,
    user_id: int,
    months: int = 3,
) -> list[dict]:
    """Return budget snapshots for the last ``months`` calendar months (newest first)."""
    months = max(1, min(months, 12))
    today = today_in_app_timezone()
    y, m = today.year, today.month
    out: list[dict] = []

    for i in range(months):
        cy, cm = _shift_month(y, m, -i)
        ref = _reference_for_month(cy, cm, today)
        snap = compute_summary(session, user_id, ref)
        start, end = month_bounds(date(cy, cm, 1))
        out.append(
            {
                "year": cy,
                "month": cm,
                "month_label": _MONTH_LABELS[cm - 1],
                "period_start": start,
                "period_end": end,
                "variable_spent_month": snap["variable_spent_month"],
                "savings_amount": snap["savings_amount"],
                "remaining_this_month": snap["remaining_this_month"],
            }
        )

    return out
