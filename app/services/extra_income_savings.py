"""How much of each extra income entry is reserved vs spendable."""

from decimal import Decimal

from app.models import ExtraIncome

ExtraIncomeSavingsMode = str  # none | all | percent | fixed


def saved_from_extra(row: ExtraIncome) -> Decimal:
    """Amount reserved from this extra income (not added to spendable budget)."""
    amount = Decimal(row.amount).quantize(Decimal("0.01"))
    mode = (row.savings_mode or "none").lower()

    if mode == "all":
        return amount
    if mode == "percent":
        pct = Decimal(row.savings_percent or 0)
        return (amount * pct / Decimal("100")).quantize(Decimal("0.01"))
    if mode == "fixed":
        fixed = Decimal(row.savings_fixed or 0).quantize(Decimal("0.01"))
        return max(Decimal("0"), min(fixed, amount))
    return Decimal("0.00")


def spendable_from_extra(row: ExtraIncome) -> Decimal:
    """Portion of extra income that increases the monthly spend budget."""
    amount = Decimal(row.amount).quantize(Decimal("0.01"))
    return (amount - saved_from_extra(row)).quantize(Decimal("0.01"))
