"""Tests for savings goals CRUD."""

from __future__ import annotations

from decimal import Decimal

import pytest


@pytest.fixture(autouse=True)
def _bypass_mx_check(monkeypatch) -> None:
    monkeypatch.setattr("app.routers.auth._domain_has_mx", lambda _domain: True)


def test_list_goals_empty(client) -> None:
    r = client.get("/api/savings-goals")
    assert r.status_code == 200
    assert r.json() == []


def test_create_and_list_goal(client) -> None:
    r = client.post(
        "/api/savings-goals",
        json={"name": "Vacaciones", "target_amount": "1500.00"},
    )
    assert r.status_code == 201
    goal = r.json()
    assert goal["name"] == "Vacaciones"
    assert Decimal(str(goal["target_amount"])) == Decimal("1500.00")
    assert Decimal(str(goal["current_amount"])) == Decimal("0")
    assert goal["target_date"] is None

    listed = client.get("/api/savings-goals").json()
    assert len(listed) == 1
    assert listed[0]["id"] == goal["id"]


def test_create_goal_with_progress_and_date(client) -> None:
    r = client.post(
        "/api/savings-goals",
        json={
            "name": "Coche",
            "target_amount": "5000",
            "current_amount": "1200.50",
            "target_date": "2026-12-31",
        },
    )
    assert r.status_code == 201
    goal = r.json()
    assert Decimal(str(goal["current_amount"])) == Decimal("1200.50")
    assert goal["target_date"] == "2026-12-31"


def test_create_goal_invalid_name(client) -> None:
    r = client.post(
        "/api/savings-goals",
        json={"name": "   ", "target_amount": "100"},
    )
    assert r.status_code == 422


def test_create_goal_zero_target(client) -> None:
    r = client.post(
        "/api/savings-goals",
        json={"name": "X", "target_amount": "0"},
    )
    assert r.status_code == 422


def test_patch_goal_current_amount(client) -> None:
    created = client.post(
        "/api/savings-goals",
        json={"name": "Fondo", "target_amount": "1000"},
    ).json()
    goal_id = created["id"]

    r = client.patch(
        f"/api/savings-goals/{goal_id}",
        json={"current_amount": "250.75"},
    )
    assert r.status_code == 200
    assert Decimal(str(r.json()["current_amount"])) == Decimal("250.75")


def test_patch_goal_rename(client) -> None:
    created = client.post(
        "/api/savings-goals",
        json={"name": "Old", "target_amount": "500"},
    ).json()

    r = client.patch(
        f"/api/savings-goals/{created['id']}",
        json={"name": "Nuevo nombre"},
    )
    assert r.status_code == 200
    assert r.json()["name"] == "Nuevo nombre"


def test_delete_goal(client) -> None:
    created = client.post(
        "/api/savings-goals",
        json={"name": "Borrar", "target_amount": "100"},
    ).json()

    r = client.delete(f"/api/savings-goals/{created['id']}")
    assert r.status_code == 204
    assert client.get("/api/savings-goals").json() == []


def test_other_users_goal_not_found(client, db_session) -> None:
    from app.auth import hash_password
    from app.models import SavingsGoal, User, UserSettings

    other = User(
        email="other-goals@example.com",
        name="Other",
        password_hash=hash_password("secret-password"),
    )
    other.settings = UserSettings()
    db_session.add(other)
    db_session.commit()
    db_session.refresh(other)

    row = SavingsGoal(
        user_id=other.id,
        name="Privado",
        target_amount=Decimal("999"),
    )
    db_session.add(row)
    db_session.commit()
    db_session.refresh(row)

    assert client.patch(
        f"/api/savings-goals/{row.id}", json={"current_amount": "1"}
    ).status_code == 404
    assert client.delete(f"/api/savings-goals/{row.id}").status_code == 404


def test_goals_require_auth(anon_client) -> None:
    assert anon_client.get("/api/savings-goals").status_code == 401
    assert anon_client.post(
        "/api/savings-goals",
        json={"name": "X", "target_amount": "100"},
    ).status_code == 401
