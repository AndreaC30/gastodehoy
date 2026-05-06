"""Contrato HTTP (TestClient + misma DB SQLite que conftest)."""

from __future__ import annotations

from decimal import Decimal


def test_health(client) -> None:
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body.get("status") == "ok"
    assert body.get("database") == "ok"


def test_summary_defaults(client) -> None:
    r = client.get("/api/summary")
    assert r.status_code == 200
    data = r.json()
    assert float(data["monthly_income"]) == 0.0
    assert int(data["days_remaining_in_month"]) >= 1


def test_settings_put_and_summary(client) -> None:
    pr = client.put(
        "/api/settings",
        json={"monthly_income": "2500.00", "savings_percent": "20.00"},
    )
    assert pr.status_code == 200

    r = client.get("/api/summary")
    assert r.status_code == 200
    data = r.json()
    assert Decimal(str(data["savings_amount"])) == Decimal("500.00")
    assert Decimal(str(data["monthly_budget_after_fixed_and_savings"])) == Decimal("2000.00")


def test_fixed_expense_whitespace_name_rejected(client) -> None:
    r = client.post(
        "/api/fixed-expenses",
        json={"name": "   ", "amount": "10.00"},
    )
    assert r.status_code == 422


def test_add_variable_expense_updates_summary(client) -> None:
    client.put(
        "/api/settings",
        json={"monthly_income": "900.00", "savings_percent": "0"},
    )
    r = client.post(
        "/api/expenses",
        json={"amount": "100.00"},
    )
    assert r.status_code == 200

    s = client.get("/api/summary")
    assert s.status_code == 200
    assert Decimal(str(s.json()["variable_spent_month"])) == Decimal("100.00")


def test_delete_variable_expense(client) -> None:
    cr = client.post("/api/expenses", json={"amount": "25.00"})
    assert cr.status_code == 200
    eid = cr.json()["id"]

    dr = client.delete(f"/api/expenses/{eid}")
    assert dr.status_code == 204

    s = client.get("/api/summary")
    assert Decimal(str(s.json()["variable_spent_month"])) == Decimal("0")
