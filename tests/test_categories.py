"""Tests for category CRUD and insights endpoints."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest

from app.config import settings as app_settings


@pytest.fixture(autouse=True)
def _bypass_mx_check(monkeypatch) -> None:
    monkeypatch.setattr("app.routers.auth._domain_has_mx", lambda _domain: True)


# ── Category CRUD ──────────────────────────────────────────────────────────


def test_supermercado_backfill_for_legacy_user(db_session) -> None:
    """Cuentas antiguas sin Supermercado la reciben al arrancar (apply_sqlite_migrations)."""
    from app.database import apply_sqlite_migrations, engine
    from app.models import ExpenseCategory, User
    from app.services.categories import DEFAULT_CATEGORIES

    user = User(
        email="legacy@example.com",
        name="Legacy",
        password_hash="x",
    )
    db_session.add(user)
    db_session.commit()
    legacy_defaults = [c for c in DEFAULT_CATEGORIES if c["name"] != "Supermercado"]
    for c in legacy_defaults:
        db_session.add(
            ExpenseCategory(
                user_id=user.id,
                name=c["name"],
                color=c["color"],
                icon=c["icon"],
                is_default=True,
            )
        )
    db_session.commit()
    assert (
        db_session.query(ExpenseCategory)
        .filter(ExpenseCategory.user_id == user.id)
        .count()
        == 8
    )

    apply_sqlite_migrations(engine)

    names = {
        row.name
        for row in db_session.query(ExpenseCategory)
        .filter(ExpenseCategory.user_id == user.id)
        .all()
    }
    assert "Supermercado" in names
    assert len(names) == 9


def test_register_seeds_default_categories(anon_client) -> None:
    """New user should get default categories automatically."""
    r = anon_client.post(
        "/api/auth/register",
        json={"email": "cat@e.com", "name": "Cat", "password": "supersecret1"},
    )
    assert r.status_code == 201
    cats = anon_client.get("/api/categories").json()
    assert len(cats) == 9
    names = {c["name"] for c in cats}
    assert "Comida" in names
    assert "Supermercado" in names
    assert "Transporte" in names
    assert "Ocio" in names
    # All should be marked as default
    assert all(c["is_default"] for c in cats)


def test_list_categories_returns_user_only(client) -> None:
    """Each user sees only their own categories."""
    cats = client.get("/api/categories").json()
    assert len(cats) == 9  # seeded defaults


def test_create_custom_category(client) -> None:
    r = client.post(
        "/api/categories",
        json={"name": "Mascotas", "color": "#f97316", "icon": "Baby"},
    )
    assert r.status_code == 201
    cat = r.json()
    assert cat["name"] == "Mascotas"
    assert cat["color"] == "#f97316"
    assert cat["icon"] == "Baby"
    assert cat["is_default"] is False


def test_create_category_invalid_color(client) -> None:
    r = client.post(
        "/api/categories",
        json={"name": "Bad", "color": "not-a-color"},
    )
    assert r.status_code == 422


def test_create_category_empty_name(client) -> None:
    r = client.post(
        "/api/categories",
        json={"name": "   ", "color": "#ff0000"},
    )
    assert r.status_code == 422


def test_update_category(client) -> None:
    cats = client.get("/api/categories").json()
    cat_id = cats[0]["id"]
    r = client.patch(
        f"/api/categories/{cat_id}",
        json={"name": "Alimentación", "color": "#22c55e"},
    )
    assert r.status_code == 200
    updated = r.json()
    assert updated["name"] == "Alimentación"
    assert updated["color"] == "#22c55e"


def test_delete_category(client) -> None:
    # Create a custom category first
    created = client.post(
        "/api/categories",
        json={"name": "ToDelete", "color": "#ff0000"},
    ).json()
    cat_id = created["id"]

    # Delete it
    r = client.delete(f"/api/categories/{cat_id}")
    assert r.status_code == 204

    # Verify it's gone
    cats = client.get("/api/categories").json()
    assert all(c["id"] != cat_id for c in cats)


def test_delete_other_users_category(client, db_session) -> None:
    """Cannot delete another user's category."""
    from app.auth import hash_password
    from app.models import User, UserSettings
    from app.services.categories import seed_default_categories

    other = User(
        email="other@example.com",
        name="Other",
        password_hash=hash_password("secret-password"),
    )
    other.settings = UserSettings()
    db_session.add(other)
    db_session.commit()
    db_session.refresh(other)
    seed_default_categories(db_session, other.id)

    other_cats = db_session.query(
        __import__("app.models", fromlist=["ExpenseCategory"]).ExpenseCategory
    ).filter_by(user_id=other.id).all()
    assert len(other_cats) > 0
    other_cat_id = other_cats[0].id

    r = client.delete(f"/api/categories/{other_cat_id}")
    assert r.status_code == 404


def test_categories_require_auth(anon_client) -> None:
    assert anon_client.get("/api/categories").status_code == 401
    assert anon_client.post(
        "/api/categories", json={"name": "X", "color": "#000000"}
    ).status_code == 401


# ── Expenses with categories ───────────────────────────────────────────────


def test_create_expense_with_category(client) -> None:
    cats = client.get("/api/categories").json()
    food_cat = next(c for c in cats if c["name"] == "Comida")

    r = client.post(
        "/api/expenses",
        json={"amount": "12.50", "category_id": food_cat["id"], "note": "Almuerzo"},
    )
    assert r.status_code == 200
    exp = r.json()
    assert exp["category_id"] == food_cat["id"]


def test_create_expense_without_category(client) -> None:
    r = client.post("/api/expenses", json={"amount": "5.00"})
    assert r.status_code == 200
    exp = r.json()
    assert exp["category_id"] is None


def test_create_expense_rejects_foreign_category_id(client, db_session) -> None:
    """Cannot attach another user's category to an expense."""
    from app.auth import hash_password
    from app.models import User, UserSettings
    from app.services.categories import seed_default_categories

    other = User(
        email="other2@example.com",
        name="Other2",
        password_hash=hash_password("secret-password"),
    )
    other.settings = UserSettings()
    db_session.add(other)
    db_session.commit()
    db_session.refresh(other)
    seed_default_categories(db_session, other.id)

    ExpenseCategory = __import__("app.models", fromlist=["ExpenseCategory"]).ExpenseCategory
    other_cat = (
        db_session.query(ExpenseCategory).filter_by(user_id=other.id).first()
    )
    assert other_cat is not None

    r = client.post(
        "/api/expenses",
        json={"amount": "1.00", "category_id": other_cat.id},
    )
    assert r.status_code == 400
    cats = client.get("/api/categories").json()
    food_cat = next(c for c in cats if c["name"] == "Comida")

    client.post(
        "/api/expenses",
        json={"amount": "12.50", "category_id": food_cat["id"]},
    )
    client.post(
        "/api/expenses",
        json={"amount": "3.00"},  # uncategorised
    )

    expenses = client.get("/api/expenses").json()
    assert len(expenses) == 2

    # The categorised expense should have category info
    categorised = next(e for e in expenses if e["category_id"] == food_cat["id"])
    assert categorised["category_name"] == "Comida"
    assert categorised["category_color"] == "#f59e0b"
    assert categorised["category_icon"] == "UtensilsCrossed"

    # The uncategorised one should have None
    uncategorised = next(e for e in expenses if e["category_id"] is None)
    assert uncategorised["category_name"] is None


def test_filter_expenses_by_category(client) -> None:
    cats = client.get("/api/categories").json()
    food_cat = next(c for c in cats if c["name"] == "Comida")
    transport_cat = next(c for c in cats if c["name"] == "Transporte")

    client.post(
        "/api/expenses",
        json={"amount": "10.00", "category_id": food_cat["id"]},
    )
    client.post(
        "/api/expenses",
        json={"amount": "20.00", "category_id": transport_cat["id"]},
    )

    food_only = client.get(f"/api/expenses?category_id={food_cat['id']}").json()
    assert len(food_only) == 1
    assert food_only[0]["category_id"] == food_cat["id"]


# ── Insights ───────────────────────────────────────────────────────────────


def test_insights_empty_month(client) -> None:
    """Insights with no expenses should return zeros and a tip."""
    r = client.get("/api/insights")
    assert r.status_code == 200
    data = r.json()
    assert Decimal(str(data["total_spent"])) == Decimal("0")
    assert data["top_category"] is None
    assert len(data["insights"]) > 0
    assert data["insights"][0]["icon"] == "lightbulb"
    assert data["insights"][0]["icon"] == "lightbulb"


def test_insights_with_categorised_expenses(client) -> None:
    """Insights should show category breakdown."""
    cats = client.get("/api/categories").json()
    food_cat = next(c for c in cats if c["name"] == "Comida")
    transport_cat = next(c for c in cats if c["name"] == "Transporte")

    client.post(
        "/api/expenses",
        json={"amount": "30.00", "category_id": food_cat["id"]},
    )
    client.post(
        "/api/expenses",
        json={"amount": "10.00", "category_id": transport_cat["id"]},
    )

    r = client.get("/api/insights")
    assert r.status_code == 200
    data = r.json()

    assert Decimal(str(data["total_spent"])) == Decimal("40.00")
    assert data["top_category"]["category_name"] == "Comida"
    assert Decimal(str(data["top_category"]["total"])) == Decimal("30.00")

    breakdown = {b["category_name"]: b for b in data["category_breakdown"]}
    assert "Comida" in breakdown
    assert "Transporte" in breakdown
    assert Decimal(str(breakdown["Comida"]["percentage"])) == Decimal("75.00")
    assert Decimal(str(breakdown["Transporte"]["percentage"])) == Decimal("25.00")


def test_insights_uncategorised_expenses(client) -> None:
    """Uncategorised expenses should appear as 'Sin categoría'."""
    client.post("/api/expenses", json={"amount": "15.00"})

    r = client.get("/api/insights")
    data = r.json()

    names = [b["category_name"] for b in data["category_breakdown"]]
    assert "Sin categoría" in names


def test_insights_high_spending_warning(client) -> None:
    """Should warn when spending is high relative to income."""
    client.put(
        "/api/settings",
        json={"monthly_income": "100.00", "savings_percent": "0"},
    )
    cats = client.get("/api/categories").json()
    food_cat = next(c for c in cats if c["name"] == "Comida")

    # Spend 90% of income
    client.post(
        "/api/expenses",
        json={"amount": "90.00", "category_id": food_cat["id"]},
    )

    r = client.get("/api/insights")
    data = r.json()

    warning_titles = [i["title"] for i in data["insights"]]
    assert any("ingreso" in t.lower() for t in warning_titles)


def test_insights_requires_auth(anon_client) -> None:
    assert anon_client.get("/api/insights").status_code == 401


def test_insights_filter_by_year_month(client) -> None:
    """Insights should accept year/month filters."""
    cats = client.get("/api/categories").json()
    food_cat = next(c for c in cats if c["name"] == "Comida")

    today = date.today()
    client.post(
        "/api/expenses",
        json={
            "amount": "25.00",
            "category_id": food_cat["id"],
            "occurred_at": today.isoformat(),
        },
    )

    r = client.get(f"/api/insights?year={today.year}&month={today.month}")
    assert r.status_code == 200
    data = r.json()
    assert Decimal(str(data["total_spent"])) == Decimal("25.00")
