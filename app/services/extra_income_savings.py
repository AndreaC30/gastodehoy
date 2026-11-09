"""How much of each extra income entry is reserved vs spendable."""

from decimal import Decimal

from app.models import ExtraIncome
from app.money import cents_to_euros, percent_of_cents, to_cents


def saved_cents(row: ExtraIncome) -> int:
    """Cents reserved from this extra income (not added to spendable budget)."""
    amount = to_cents(row.amount)
    mode = (row.savings_mode or "none").lower()

    if mode == "all":
        return amount
    if mode == "percent":
        return percent_of_cents(amount, Decimal(row.savings_percent or 0))
    if mode == "fixed":
        return max(0, min(to_cents(row.savings_fixed or 0), amount))
    return 0


def spendable_cents(row: ExtraIncome) -> int:
    """Cents of extra income that increase the monthly spend budget."""
    return to_cents(row.amount) - saved_cents(row)


def saved_from_extra(row: ExtraIncome) -> Decimal:
    """Euros reserved from this extra income."""
    return cents_to_euros(saved_cents(row))


def spendable_from_extra(row: ExtraIncome) -> Decimal:
    """Euros of extra income that increase the monthly spend budget."""
    return cents_to_euros(spendable_cents(row))
