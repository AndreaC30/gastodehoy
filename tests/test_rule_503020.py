"""Tests for the 50/30/20 budget rule."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import select

from app.models import ExpenseCategory, FixedExpense, UserSettings, VariableExpense
from app.services.rule_503020 import bucket_for_category_name, compute_rule_503020


def test_bucket_for_default_categories() -> None:
    assert bucket_for_category_name("Comida") == "need"
    assert bucket_for_category_name("Ocio") == "want"
    assert bucket_for_category_name("Otros") == "other"
    assert bucket_for_category_name("Custom") == "other"
    assert bucket_for_category_name(None) == "other"


def test_compute_rule_503020_splits_spending(db_session, user) -> None:
    us = user.settings
    assert isinstance(us, UserSettings)
    us.monthly_income = Decimal("2000.00")
    us.savings_percent = Decimal("20.00")
    db_session.add(
        FixedExpense(user_id=user.id, name="Alquiler", amount=Decimal("600.00"))
    )
    comida = db_session.scalar(
        select(ExpenseCategory).where(
            ExpenseCategory.user_id == user.id,
            ExpenseCategory.name == "Comida",
        )
    )
    ocio = db_session.scalar(
        select(ExpenseCategory).where(
            ExpenseCategory.user_id == user.id,
            ExpenseCategory.name == "Ocio",
        )
    )
    otros = db_session.scalar(
        select(ExpenseCategory).where(
            ExpenseCategory.user_id == user.id,
            ExpenseCategory.name == "Otros",
        )
    )
    db_session.add_all(
        [
            VariableExpense(
                user_id=user.id,
                amount=Decimal("100.00"),
                occurred_at=date(2026, 5, 5),
                category_id=comida.id,
            ),
            VariableExpense(
                user_id=user.id,
                amount=Decimal("50.00"),
                occurred_at=date(2026, 5, 8),
                category_id=ocio.id,
            ),
            VariableExpense(
                user_id=user.id,
                amount=Decimal("25.00"),
                occurred_at=date(2026, 5, 10),
                category_id=otros.id,
            ),
        ]
    )
    db_session.commit()

    out = compute_rule_503020(db_session, user.id, date(2026, 5, 15))

    assert out["income"] == Decimal("2000.00")
    assert out["savings_amount"] == Decimal("400.00")
    assert out["needs_spent"] == Decimal("700.00")
    assert out["wants_spent"] == Decimal("50.00")
    assert out["other_spent"] == Decimal("25.00")
    assert out["needs_pct"] == Decimal("35.00")
    assert out["wants_pct"] == Decimal("2.50")
    assert out["savings_pct"] == Decimal("20.00")
    assert len(out["insights"]) >= 1


def test_rule_503020_api(client, db_session, user) -> None:
    us = user.settings
    us.monthly_income = Decimal("1000.00")
    us.savings_percent = Decimal("10.00")
    db_session.commit()
    r = client.get("/api/rule-503020?year=2026&month=5")
    assert r.status_code == 200
    data = r.json()
    assert data["income"] == "1000.00"
    assert data["target_needs_pct"] == "50"
    assert isinstance(data["insights"], list)
