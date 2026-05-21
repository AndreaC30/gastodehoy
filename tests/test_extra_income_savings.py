"""Extra income savings modes affect spendable budget."""

from datetime import date
from decimal import Decimal

from app.models import ExtraIncome
from app.services.budget import compute_summary


def test_extra_income_none_adds_full_amount(db_session, user) -> None:
    us = user.settings
    us.monthly_income = Decimal("2000.00")
    us.savings_percent = Decimal("10.00")
    db_session.add(
        ExtraIncome(
            user_id=user.id,
            amount=Decimal("300.00"),
            received_at=date(2026, 5, 20),
            savings_mode="none",
        )
    )
    db_session.commit()

    out = compute_summary(db_session, user.id, date(2026, 5, 15))
    assert out["extra_income_month"] == Decimal("300.00")
    assert out["extra_income_saved_month"] == Decimal("0.00")
    assert out["monthly_budget_after_fixed_and_savings"] == Decimal("2100.00")


def test_extra_income_all_saved_excluded_from_budget(db_session, user) -> None:
    us = user.settings
    us.monthly_income = Decimal("2000.00")
    us.savings_percent = Decimal("10.00")
    db_session.add(
        ExtraIncome(
            user_id=user.id,
            amount=Decimal("300.00"),
            received_at=date(2026, 5, 20),
            savings_mode="all",
        )
    )
    db_session.commit()

    out = compute_summary(db_session, user.id, date(2026, 5, 15))
    assert out["extra_income_month"] == Decimal("300.00")
    assert out["extra_income_saved_month"] == Decimal("300.00")
    assert out["monthly_budget_after_fixed_and_savings"] == Decimal("1800.00")


def test_extra_income_percent_saved_partially(db_session, user) -> None:
    us = user.settings
    us.monthly_income = Decimal("1000.00")
    us.savings_percent = Decimal("0")
    db_session.add(
        ExtraIncome(
            user_id=user.id,
            amount=Decimal("200.00"),
            received_at=date(2026, 5, 10),
            savings_mode="percent",
            savings_percent=Decimal("25.00"),
        )
    )
    db_session.commit()

    out = compute_summary(db_session, user.id, date(2026, 5, 15))
    assert out["extra_income_saved_month"] == Decimal("50.00")
    assert out["monthly_budget_after_fixed_and_savings"] == Decimal("1150.00")
