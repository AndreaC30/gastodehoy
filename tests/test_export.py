"""Tests for CSV export."""

from datetime import date
from decimal import Decimal

from app.models import FixedExpense, UserSettings, VariableExpense


def test_export_csv_requires_auth(anon_client) -> None:
    r = anon_client.get("/api/export/csv")
    assert r.status_code == 401


def test_export_csv_includes_sections(client, db_session, user) -> None:
    us = user.settings
    us.monthly_income = Decimal("2500.00")
    us.savings_percent = Decimal("15.00")
    db_session.add(
        FixedExpense(user_id=user.id, name="Internet", amount=Decimal("40.00"))
    )
    db_session.add(
        VariableExpense(
            user_id=user.id,
            amount=Decimal("12.50"),
            occurred_at=date.today(),
            note="Café",
        )
    )
    db_session.commit()

    r = client.get("/api/export/csv")
    assert r.status_code == 200
    assert "text/csv" in r.headers.get("content-type", "")
    body = r.text
    assert "seccion,campo,valor" in body
    assert "ajustes" in body
    assert "ingreso_mensual" in body
    assert "gastos_fijos" in body
    assert "Internet" in body
    assert "gastos_variables" in body
    assert "12.50" in body
