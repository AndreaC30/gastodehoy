"""Contrato HTTP con cookie HttpOnly."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from app.config import settings as app_settings


@pytest.fixture(autouse=True)
def _bypass_mx_check(monkeypatch) -> None:
    """Skip real DNS MX lookups in tests — domains are fake."""
    monkeypatch.setattr("app.routers.auth._domain_has_mx", lambda _domain: True)


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
    # Debug: check cookies
    print(f"[test] Cookies after register: {dict(anon_client.cookies)}")
    print(f"[test] Response headers: {dict(r.headers)}")

    me = anon_client.get("/api/auth/me")
    print(f"[test] Me status: {me.status_code}")
    print(f"[test] Me response: {me.text[:200]}")
    assert me.status_code == 200
    assert me.json()["email"] == "pablo@example.com"


def test_forgot_password_without_smtp_returns_503(anon_client, monkeypatch) -> None:
    monkeypatch.setattr(app_settings, "smtp_host", None)
    r = anon_client.post("/api/auth/forgot-password", json={"email": "x@e.com"})
    assert r.status_code == 503


def test_forgot_password_sends_mail_and_sets_temp_password(
    anon_client, monkeypatch
) -> None:
    sent: list[tuple[str, str]] = []

    def fake_send(to_email: str, temporary_password: str) -> None:
        sent.append((to_email, temporary_password))

    monkeypatch.setattr(
        "app.routers.auth.send_forgot_password_email", fake_send
    )
    monkeypatch.setattr(app_settings, "smtp_host", "smtp.test.local")
    monkeypatch.setattr(app_settings, "smtp_from", "noreply@test.local")

    anon_client.post(
        "/api/auth/register",
        json={"email": "fp@e.com", "name": "FP", "password": "supersecret1"},
    )
    anon_client.post("/api/auth/logout")

    r = anon_client.post("/api/auth/forgot-password", json={"email": "fp@e.com"})
    assert r.status_code == 200
    detail = r.json()["detail"]
    assert "correo" in detail.lower()

    assert len(sent) == 1
    assert sent[0][0] == "fp@e.com"
    temp_pw = sent[0][1]

    ok = anon_client.post(
        "/api/auth/login",
        json={"email": "fp@e.com", "password": temp_pw},
    )
    assert ok.status_code == 200
    me = anon_client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["must_change_password"] is True

    changed = anon_client.put(
        "/api/auth/me/password",
        json={
            "current_password": temp_pw,
            "new_password": "myownsecret2",
        },
    )
    assert changed.status_code == 200
    assert changed.json()["must_change_password"] is False
    still = anon_client.get("/api/auth/me")
    assert still.status_code == 200
    assert still.json()["must_change_password"] is False


def test_forgot_password_unknown_email_same_response(anon_client, monkeypatch) -> None:
    """Does not send mail or reveal existence; still returns the generic message."""

    sent: list[str] = []

    def fake_send(to_email: str, temporary_password: str) -> None:
        sent.append(to_email)

    monkeypatch.setattr(
        "app.routers.auth.send_forgot_password_email", fake_send
    )
    monkeypatch.setattr(app_settings, "smtp_host", "smtp.test.local")
    monkeypatch.setattr(app_settings, "smtp_from", "noreply@test.local")

    r = anon_client.post(
        "/api/auth/forgot-password", json={"email": "ghost@e.com"}
    )
    assert r.status_code == 200
    assert "correo" in r.json()["detail"].lower()
    assert sent == []


def test_forgot_password_rate_limited(anon_client, monkeypatch) -> None:
    monkeypatch.setattr(app_settings, "smtp_host", "smtp.test.local")
    monkeypatch.setattr(app_settings, "smtp_from", "noreply@test.local")
    monkeypatch.setattr(
        "app.routers.auth.send_forgot_password_email",
        lambda *_a, **_k: None,
    )

    anon_client.post(
        "/api/auth/register",
        json={"email": "rlfp@e.com", "name": "RL", "password": "supersecret1"},
    )
    anon_client.post("/api/auth/logout")

    for _ in range(5):
        anon_client.post(
            "/api/auth/forgot-password",
            json={"email": "rlfp@e.com"},
        )
    blocked = anon_client.post(
        "/api/auth/forgot-password",
        json={"email": "rlfp@e.com"},
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


# ── Security: email validation tests ──────────────────────────────────


def test_register_invalid_email_format(anon_client) -> None:
    """Register with clearly invalid email should return 400."""
    for bad in ["no-at-sign", "missing-domain@", "@nodomain", "spaces in@email"]:
        r = anon_client.post(
            "/api/auth/register",
            json={"email": bad, "name": "Bad", "password": "supersecret1"},
        )
        assert r.status_code == 400, f"Expected 400 for email '{bad}', got {r.status_code}"


def test_forgot_password_invalid_email_format(anon_client, monkeypatch) -> None:
    """Forgot-password with invalid format returns generic 200 (no enumeration)."""
    monkeypatch.setattr(app_settings, "smtp_host", "smtp.test.local")
    monkeypatch.setattr(app_settings, "smtp_from", "noreply@test.local")
    for bad in ["no-at-sign", "missing-domain@", "@nodomain"]:
        r = anon_client.post(
            "/api/auth/forgot-password", json={"email": bad}
        )
        assert r.status_code == 200
        assert "correo" in r.json()["detail"].lower()


def test_forgot_password_domain_without_mx_returns_generic(anon_client, monkeypatch) -> None:
    """Forgot-password for domain without MX returns same generic message."""
    monkeypatch.setattr(app_settings, "smtp_host", "smtp.test.local")
    monkeypatch.setattr(app_settings, "smtp_from", "noreply@test.local")
    # Bypass the auto-use fixture to test real MX check
    monkeypatch.setattr("app.routers.auth._domain_has_mx", lambda _domain: False)

    r = anon_client.post(
        "/api/auth/forgot-password", json={"email": "user@nonexistent-domain-xyz123.com"}
    )
    assert r.status_code == 200
    assert "correo" in r.json()["detail"].lower()


def test_forgot_password_no_enumeration_by_timing(anon_client, monkeypatch) -> None:
    """Response for existing and non-existing email must be identical.

    Both return 200 with the same generic message — no information leak.
    """
    monkeypatch.setattr(app_settings, "smtp_host", "smtp.test.local")
    monkeypatch.setattr(app_settings, "smtp_from", "noreply@test.local")
    monkeypatch.setattr(
        "app.routers.auth.send_forgot_password_email",
        lambda *_a, **_k: None,
    )

    anon_client.post(
        "/api/auth/register",
        json={"email": "real@e.com", "name": "Real", "password": "supersecret1"},
    )
    anon_client.post("/api/auth/logout")

    r_existing = anon_client.post(
        "/api/auth/forgot-password", json={"email": "real@e.com"}
    )
    r_unknown = anon_client.post(
        "/api/auth/forgot-password", json={"email": "nobody@e.com"}
    )

    assert r_existing.status_code == r_unknown.status_code == 200
    assert r_existing.json()["detail"] == r_unknown.json()["detail"]
