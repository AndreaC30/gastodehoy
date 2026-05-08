"""Lógica del presupuesto (sin HTTP)."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from app.models import FixedExpense, UserSettings, VariableExpense
from app.services.budget import compute_summary


def test_compute_summary_mid_month_no_spending(db_session, user) -> None:
    us = user.settings
    assert isinstance(us, UserSettings)
    us.monthly_income = Decimal("3000.00")
    us.savings_percent = Decimal("10.00")
    db_session.commit()

    ref = date(2026, 5, 15)
    out = compute_summary(db_session, user.id, ref)

    assert out["reference_date"] == ref
    assert out["days_remaining_in_month"] == 17
    assert out["savings_amount"] == Decimal("300.00")
    assert out["fixed_expenses_total"] == Decimal("0.00")
    assert out["variable_spent_month"] == Decimal("0.00")
    assert out["remaining_this_month"] == Decimal("2700.00")
    expected_daily = (Decimal("2700") / Decimal(17)).quantize(Decimal("0.01"))
    assert out["suggested_spend_today"] == expected_daily


def test_compute_summary_with_fixed_and_variable(db_session, user) -> None:
    us = user.settings
    us.monthly_income = Decimal("2000.00")
    us.savings_percent = Decimal("0")
    db_session.add(
        FixedExpense(user_id=user.id, name="Alquiler", amount=Decimal("800.00"))
    )
    db_session.add(
        VariableExpense(
            user_id=user.id,
            amount=Decimal("100.00"),
            occurred_at=date(2026, 5, 10),
        )
    )
    db_session.commit()

    ref = date(2026, 5, 6)
    out = compute_summary(db_session, user.id, ref)

    assert out["monthly_budget_after_fixed_and_savings"] == Decimal("1200.00")
    assert out["variable_spent_month"] == Decimal("100.00")
    assert out["remaining_this_month"] == Decimal("1100.00")
    assert out["days_remaining_in_month"] == 26


def test_compute_summary_fixed_savings_mode(db_session, user) -> None:
    """En modo 'fixed' el ahorro NO escala con el ingreso."""
    us = user.settings
    us.monthly_income = Decimal("3000.00")
    us.savings_mode = "fixed"
    us.savings_amount = Decimal("500.00")
    us.savings_percent = Decimal("99.00")  # ignorado en modo fixed
    db_session.commit()

    out = compute_summary(db_session, user.id, date(2026, 5, 15))

    assert out["savings_mode"] == "fixed"
    assert out["savings_amount"] == Decimal("500.00")
    assert out["monthly_budget_after_fixed_and_savings"] == Decimal("2500.00")


def test_compute_summary_fixed_savings_capped_to_income(db_session, user) -> None:
    """Si el 'fijo' supera el ingreso, capamos a income (no hay ahorro negativo)."""
    us = user.settings
    us.monthly_income = Decimal("1000.00")
    us.savings_mode = "fixed"
    us.savings_amount = Decimal("9999.00")
    db_session.commit()

    out = compute_summary(db_session, user.id, date(2026, 5, 15))
    assert out["savings_amount"] == Decimal("1000.00")
    assert out["monthly_budget_after_fixed_and_savings"] == Decimal("0.00")


def test_compute_summary_over_budget_negative_suggested(db_session, user) -> None:
    us = user.settings
    us.monthly_income = Decimal("1000.00")
    us.savings_percent = Decimal("0")
    db_session.add(
        VariableExpense(
            user_id=user.id,
            amount=Decimal("1500.00"),
            occurred_at=date(2026, 3, 1),
        )
    )
    db_session.commit()

    out = compute_summary(db_session, user.id, date(2026, 3, 5))

    assert out["remaining_this_month"] < 0
    assert out["suggested_spend_today"] < 0
