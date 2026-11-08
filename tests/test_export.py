"""Tests for CSV export."""

import csv
import io
from datetime import date
from decimal import Decimal

from app.auth import hash_password
from app.models import (
    ExpenseCategory,
    ExtraIncome,
    FixedExpense,
    SavingsGoal,
    User,
    UserSettings,
    VariableExpense,
)


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


def test_export_csv_full_data_and_formula_escape(client, db_session, user) -> None:
    db_session.add(
        VariableExpense(
            user_id=user.id,
            amount=Decimal("8.00"),
            occurred_at=date(2020, 1, 15),
            note="=1+1",
        )
    )
    db_session.add(
        ExtraIncome(
            user_id=user.id,
            amount=Decimal("150.00"),
            received_at=date(2020, 2, 1),
            savings_mode="none",
        )
    )
    db_session.add(
        SavingsGoal(
            user_id=user.id,
            name="\t=cmd",
            target_amount=Decimal("500.00"),
            current_amount=Decimal("20.00"),
        )
    )
    db_session.add(
        ExpenseCategory(
            user_id=user.id,
            name="Mascotas",
            color="#112233",
            icon="Paw",
            monthly_budget=Decimal("30.00"),
        )
    )
    other = User(
        email="other-export@example.com",
        name="Other",
        password_hash=hash_password("secret-password"),
    )
    other.settings = UserSettings()
    db_session.add(other)
    db_session.flush()
    db_session.add(
        VariableExpense(
            user_id=other.id,
            amount=Decimal("77.77"),
            occurred_at=date(2019, 3, 3),
            note="ajeno-secreto",
        )
    )
    db_session.commit()

    r = client.get("/api/export/csv")
    assert r.status_code == 200
    rows = list(csv.reader(io.StringIO(r.text)))

    variables = [row for row in rows if row and row[0] == "gasto_variable"]
    assert len(variables) == 1
    assert variables[0][1] == "2020-01-15"
    assert variables[0][2] == "8.00"
    assert variables[0][4] == "'=1+1"

    extras = [row for row in rows if row and row[0] == "ingreso_extra"]
    assert len(extras) == 1
    assert extras[0][1] == "2020-02-01"
    assert extras[0][2] == "150.00"

    goals = [row for row in rows if row and row[0] == "meta_ahorro"]
    assert len(goals) == 1
    assert goals[0][1] == "'\t=cmd"
    assert goals[0][2] == "500.00"

    categories = [row for row in rows if row and row[0] == "categoria"]
    mascotas = next(row for row in categories if row[1] == "Mascotas")
    assert mascotas[2] == "30.00"
    assert mascotas[3] == "#112233"
    assert mascotas[4] == "Paw"

    assert "ajeno-secreto" not in r.text
    assert "2019-03-03" not in r.text
    assert "77.77" not in r.text
