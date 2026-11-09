"""Money as integer cents in SQLite and decimal euros in Python.

SQLite stores ``Numeric`` as REAL. Summing those floats is not exact, and
quantizing the result hides the error. These helpers keep the database
value as cents and build a ``Decimal`` only when a euro amount is shown.
"""

from decimal import Decimal, ROUND_HALF_EVEN, ROUND_HALF_UP

from sqlalchemy import Integer, cast, func, select
from sqlalchemy.orm import Session
from sqlalchemy.types import TypeDecorator


def euros_to_cents(value: Decimal | int | float | str) -> int:
    """Nearest cent, half away from zero.

    Floats use ``str(value)`` so the shortest decimal is what gets rounded,
    which is how legacy REAL amounts are read back.
    """
    if isinstance(value, bool):
        raise TypeError("money value cannot be bool")
    if isinstance(value, float):
        dec = Decimal(str(value))
    elif isinstance(value, Decimal):
        dec = value
    elif isinstance(value, int):
        dec = Decimal(value)
    else:
        dec = Decimal(str(value).strip())
    quantized = dec.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return int(quantized * 100)


def to_cents(value: Decimal | int | float | str | None) -> int:
    """``None`` is zero cents. Every other value goes through ``euros_to_cents``."""
    if value is None:
        return 0
    return euros_to_cents(value)


def cents_to_euros(cents: int) -> Decimal:
    """Exact euros from an integer number of cents, always with two places."""
    return (Decimal(int(cents)) / Decimal(100)).quantize(Decimal("0.01"))


def percent_of_cents(cents: int, percent: Decimal) -> int:
    """Percent of a cent amount, rounded like ``Decimal.quantize`` (half even).

    Savings percents are not money. This matches the previous euro quantize
    so a percent rule does not change when storage moves to cents.
    """
    raw = Decimal(int(cents)) * Decimal(percent) / Decimal(100)
    return int(raw.quantize(Decimal("1"), rounding=ROUND_HALF_EVEN))


def sum_column_cents(session: Session, column, *criteria) -> int:
    """SQL ``SUM`` of an integer-cents column. Empty groups sum to 0.

    The cast keeps the total in cents. Without it, the column type would
    turn the sum into euros before the arithmetic.
    """
    total = cast(func.coalesce(func.sum(column), 0), Integer)
    raw = session.scalar(select(total).where(*criteria))
    return int(raw or 0)


class Cents(TypeDecorator):
    """INTEGER cents in SQLite. Python attributes stay decimal euros."""

    impl = Integer
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return euros_to_cents(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return cents_to_euros(int(value))
