"""Contrato HTTP con cookie HttpOnly."""

from __future__ import annotations

from datetime import date
from decimal import Decimal


def test_health(anon_client) -> None:
    r = anon_client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body.get("status") == "ok"
    assert body.get("database") == "ok"


def test_protected_endpoints_require_auth(anon_client) -> None:
    assert anon_client.get("/api/summary").status_code == 401
    assert anon_client.get("/api/settings").status_code == 401
    assert anon_client.get("/api/fixed-expenses").status_code == 401
    assert anon_client.get("/api/expenses").status_code == 401
    assert anon_client.get("/api/extra-income").status_code == 401
    assert anon_client.get("/api/auth/me").status_code == 401


def test_register_sets_cookie_and_me_works(anon_client) -> None:
    r = anon_client.post(
        "/api/auth/register",
        json={
            "email": "Pablo@Example.com",
            "name": "Pablo",
            "password": "supersecret1",
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert body["user"]["email"] == "pablo@example.com"
    assert body["user"]["name"] == "Pablo"
    assert body["recovery_code"].startswith("gdh-")

    me = anon_client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "pablo@example.com"


def test_recover_with_valid_code_sets_new_password_and_rotates_code(
    anon_client,
) -> None:
    reg = anon_client.post(
        "/api/auth/register",
        json={"email": "lost@e.com", "name": "L", "password": "supersecret1"},
    )
    code = reg.json()["recovery_code"]
    anon_client.post("/api/auth/logout")

    r = anon_client.post(
        "/api/auth/recover",
        json={
            "email": "lost@e.com",
            "recovery_code": code,
            "new_password": "newsecret1",
        },
    )
    assert r.status_code == 200
    new_code = r.json()["recovery_code"]
    assert new_code.startswith("gdh-")
    assert new_code != code

    # Login con la NUEVA contraseña funciona.
    ok = anon_client.post(
        "/api/auth/login",
        json={"email": "lost@e.com", "password": "newsecret1"},
    )
    assert ok.status_code == 200

    # El código viejo ya no sirve (uso único).
    anon_client.post("/api/auth/logout")
    bad = anon_client.post(
        "/api/auth/recover",
        json={
            "email": "lost@e.com",
            "recovery_code": code,
            "new_password": "anothersecret1",
        },
    )
    assert bad.status_code == 401


def test_recover_wrong_code_rejected(anon_client) -> None:
    anon_client.post(
        "/api/auth/register",
        json={"email": "w@e.com", "name": "W", "password": "supersecret1"},
    )
    anon_client.post("/api/auth/logout")
    r = anon_client.post(
        "/api/auth/recover",
        json={
            "email": "w@e.com",
            "recovery_code": "gdh-aaaa-bbbb-cccc-dddd",
            "new_password": "newsecret1",
        },
    )
    assert r.status_code == 401


def test_recover_rate_limited(anon_client) -> None:
    anon_client.post(
        "/api/auth/register",
        json={"email": "rl@e.com", "name": "RL", "password": "supersecret1"},
    )
    anon_client.post("/api/auth/logout")
    for _ in range(5):
        anon_client.post(
            "/api/auth/recover",
            json={
                "email": "rl@e.com",
                "recovery_code": "gdh-zzzz-zzzz-zzzz-zzzz",
                "new_password": "newsecret1",
            },
        )
    blocked = anon_client.post(
        "/api/auth/recover",
        json={
            "email": "rl@e.com",
            "recovery_code": "gdh-zzzz-zzzz-zzzz-zzzz",
            "new_password": "newsecret1",
        },
    )
    assert blocked.status_code == 429


def test_register_duplicate_email_conflicts(anon_client) -> None:
    anon_client.post(
        "/api/auth/register",
        json={"email": "ana@example.com", "name": "Ana", "password": "supersecret1"},
    )
    dup = anon_client.post(
        "/api/auth/register",
        json={"email": "ANA@EXAMPLE.com", "name": "Ana 2", "password": "supersecret1"},
    )
    assert dup.status_code == 409


def test_login_and_logout_cycle(anon_client) -> None:
    anon_client.post(
        "/api/auth/register",
        json={"email": "u@e.com", "name": "U", "password": "supersecret1"},
    )
    anon_client.post("/api/auth/logout")
    assert anon_client.get("/api/auth/me").status_code == 401

    bad = anon_client.post(
        "/api/auth/login",
        json={"email": "u@e.com", "password": "wrong-password"},
    )
    assert bad.status_code == 401

    ok = anon_client.post(
        "/api/auth/login",
        json={"email": "U@E.com", "password": "supersecret1"},
    )
    assert ok.status_code == 200
    assert anon_client.get("/api/auth/me").status_code == 200


def test_login_rate_limit(anon_client) -> None:
    anon_client.post(
        "/api/auth/register",
        json={"email": "r@e.com", "name": "R", "password": "supersecret1"},
    )
    anon_client.post("/api/auth/logout")
    for _ in range(5):
        anon_client.post(
            "/api/auth/login",
            json={"email": "r@e.com", "password": "wrong-password"},
        )
    blocked = anon_client.post(
        "/api/auth/login",
        json={"email": "r@e.com", "password": "supersecret1"},
    )
    assert blocked.status_code == 429


def test_users_are_isolated(anon_client) -> None:
    anon_client.post(
        "/api/auth/register",
        json={"email": "a@e.com", "name": "A", "password": "supersecret1"},
    )
    anon_client.put(
        "/api/settings", json={"monthly_income": "1000.00", "savings_percent": "10"}
    )
    anon_client.post("/api/expenses", json={"amount": "50.00"})
    anon_client.post("/api/auth/logout")

    anon_client.post(
        "/api/auth/register",
        json={"email": "b@e.com", "name": "B", "password": "supersecret1"},
    )
    s = anon_client.get("/api/summary").json()
    assert Decimal(str(s["monthly_income"])) == Decimal("0")
    assert Decimal(str(s["variable_spent_month"])) == Decimal("0")
    assert anon_client.get("/api/expenses").json() == []


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


def test_settings_put_fixed_mode(client) -> None:
    pr = client.put(
        "/api/settings",
        json={
            "monthly_income": "2000.00",
            "savings_mode": "fixed",
            "savings_amount": "300.00",
            "savings_percent": "0",
        },
    )
    assert pr.status_code == 200
    body = pr.json()
    assert body["savings_mode"] == "fixed"
    assert Decimal(str(body["savings_amount"])) == Decimal("300.00")

    s = client.get("/api/summary").json()
    assert s["savings_mode"] == "fixed"
    assert Decimal(str(s["savings_amount"])) == Decimal("300.00")
    assert Decimal(str(s["monthly_budget_after_fixed_and_savings"])) == Decimal("1700.00")


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
    r = client.post("/api/expenses", json={"amount": "100.00"})
    assert r.status_code == 200

    s = client.get("/api/summary")
    assert s.status_code == 200
    assert Decimal(str(s.json()["variable_spent_month"])) == Decimal("100.00")


def test_list_expenses_filtered_by_year_month(client) -> None:
    client.put(
        "/api/settings",
        json={"monthly_income": "1000.00", "savings_percent": "0"},
    )
    client.post(
        "/api/expenses",
        json={"amount": "10.00", "occurred_at": "2026-01-15"},
    )
    client.post(
        "/api/expenses",
        json={"amount": "25.00", "occurred_at": "2026-02-10"},
    )
    jan = client.get("/api/expenses?year=2026&month=1").json()
    assert len(jan) == 1
    assert Decimal(str(jan[0]["amount"])) == Decimal("10.00")


def test_list_extra_income_filtered_by_year_month(client) -> None:
    client.put(
        "/api/settings",
        json={"monthly_income": "1000.00", "savings_percent": "0"},
    )
    client.post(
        "/api/extra-income",
        json={"amount": "50.00", "received_at": "2026-03-05"},
    )
    client.post(
        "/api/extra-income",
        json={"amount": "75.00", "received_at": "2026-04-01"},
    )
    mar = client.get("/api/extra-income?year=2026&month=3").json()
    assert len(mar) == 1
    assert Decimal(str(mar[0]["amount"])) == Decimal("50.00")


def test_extra_income_list_post_delete_and_summary(client) -> None:
    client.put(
        "/api/settings",
        json={"monthly_income": "1000.00", "savings_percent": "0"},
    )
    today = date.today().isoformat()
    empty = client.get("/api/extra-income").json()
    assert empty == []

    cr = client.post(
        "/api/extra-income",
        json={"amount": "150.00", "received_at": today},
    )
    assert cr.status_code == 200
    row = cr.json()
    assert Decimal(str(row["amount"])) == Decimal("150.00")

    listed = client.get("/api/extra-income").json()
    assert len(listed) == 1

    s = client.get("/api/summary").json()
    assert Decimal(str(s["extra_income_month"])) == Decimal("150.00")
    assert Decimal(str(s["monthly_budget_after_fixed_and_savings"])) == Decimal("1150.00")

    dr = client.delete(f"/api/extra-income/{row['id']}")
    assert dr.status_code == 204
    assert client.get("/api/extra-income").json() == []
    s2 = client.get("/api/summary").json()
    assert Decimal(str(s2["extra_income_month"])) == Decimal("0")


def test_delete_variable_expense(client) -> None:
    cr = client.post("/api/expenses", json={"amount": "25.00"})
    assert cr.status_code == 200
    eid = cr.json()["id"]

    dr = client.delete(f"/api/expenses/{eid}")
    assert dr.status_code == 204

    s = client.get("/api/summary")
    assert Decimal(str(s.json()["variable_spent_month"])) == Decimal("0")


def test_change_password_flow(anon_client) -> None:
    anon_client.post(
        "/api/auth/register",
        json={"email": "c@e.com", "name": "C", "password": "supersecret1"},
    )
    bad = anon_client.put(
        "/api/auth/me/password",
        json={"current_password": "wrong-password", "new_password": "newsecret1"},
    )
    assert bad.status_code == 401
    ok = anon_client.put(
        "/api/auth/me/password",
        json={"current_password": "supersecret1", "new_password": "newsecret1"},
    )
    assert ok.status_code == 200
    anon_client.post("/api/auth/logout")
    relog = anon_client.post(
        "/api/auth/login", json={"email": "c@e.com", "password": "newsecret1"}
    )
    assert relog.status_code == 200


def test_change_password_invalidates_other_sessions(anon_client) -> None:
    """Otra sesión emitida ANTES de cambiar la clave queda inválida."""
    from fastapi.testclient import TestClient

    from app.main import app

    anon_client.post(
        "/api/auth/register",
        json={"email": "x@e.com", "name": "X", "password": "supersecret1"},
    )
    old_cookie = anon_client.cookies.get("gdh_session")
    assert old_cookie

    new_pw = anon_client.put(
        "/api/auth/me/password",
        json={"current_password": "supersecret1", "new_password": "newsecret1"},
    )
    assert new_pw.status_code == 200

    with TestClient(app) as other:
        other.cookies.set("gdh_session", old_cookie)
        r = other.get("/api/auth/me")
        assert r.status_code == 401
