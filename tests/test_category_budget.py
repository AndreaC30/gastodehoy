"""Tests for per-category monthly budget."""

from __future__ import annotations

from decimal import Decimal


def test_set_category_monthly_budget(client) -> None:
    cats = client.get("/api/categories").json()
    ocio = next(c for c in cats if c["name"] == "Ocio")
    assert ocio.get("monthly_budget") is None

    r = client.patch(
        f"/api/categories/{ocio['id']}",
        json={"monthly_budget": "50.00"},
    )
    assert r.status_code == 200
    assert Decimal(str(r.json()["monthly_budget"])) == Decimal("50.00")


def test_clear_category_monthly_budget(client) -> None:
    cats = client.get("/api/categories").json()
    ocio = next(c for c in cats if c["name"] == "Ocio")
    client.patch(f"/api/categories/{ocio['id']}", json={"monthly_budget": "40.00"})

    r = client.patch(
        f"/api/categories/{ocio['id']}",
        json={"monthly_budget": None},
    )
    assert r.status_code == 200
    assert r.json()["monthly_budget"] is None


def test_insights_over_budget_warning(client) -> None:
    cats = client.get("/api/categories").json()
    ocio = next(c for c in cats if c["name"] == "Ocio")
    client.patch(
        f"/api/categories/{ocio['id']}",
        json={"monthly_budget": "30.00"},
    )
    client.post(
        "/api/expenses",
        json={"amount": "45.00", "category_id": ocio["id"]},
    )

    data = client.get("/api/insights").json()
    breakdown = {b["category_name"]: b for b in data["category_breakdown"]}
    assert breakdown["Ocio"]["over_budget"] is True
    assert Decimal(str(breakdown["Ocio"]["budget_used_percent"])) == Decimal("150.00")

    titles = [i["title"] for i in data["insights"]]
    assert any("Ocio" in t and "Presupuesto superado" in t for t in titles)


def test_insights_within_budget_no_over_flag(client) -> None:
    cats = client.get("/api/categories").json()
    ocio = next(c for c in cats if c["name"] == "Ocio")
    client.patch(
        f"/api/categories/{ocio['id']}",
        json={"monthly_budget": "100.00"},
    )
    client.post(
        "/api/expenses",
        json={"amount": "20.00", "category_id": ocio["id"]},
    )

    data = client.get("/api/insights").json()
    breakdown = {b["category_name"]: b for b in data["category_breakdown"]}
    assert breakdown["Ocio"]["over_budget"] is False
    assert Decimal(str(breakdown["Ocio"]["budget_used_percent"])) == Decimal("20.00")
