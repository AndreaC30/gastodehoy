"""One journey: register, one expense, password recovery, then isolation.

The raw reset token is only placed on the link. The test database stores
its hash on the user, and this module reads that row the same way the API
tests do. Mail delivery is stubbed in-process, so no SMTP server is used.
"""

from __future__ import annotations

from decimal import Decimal
from urllib.parse import parse_qs, urlparse

from sqlalchemy import select

from app.auth import hash_reset_token
from app.config import settings as app_settings
from app.database import SessionLocal
from app.legal import LEGAL_TERMS_VERSION
from app.models import User

_OWNER_EMAIL = "owner@e2e.example"
_OTHER_EMAIL = "other@e2e.example"
_OLD_PASSWORD = "supersecret1"
_NEW_PASSWORD = "newsecret2"
_EXPENSE_AMOUNT = "18.40"
_EXPENSE_NOTE = "e2e-only-expense"


def _register(client, email: str, name: str, password: str) -> dict:
    response = client.post(
        "/api/auth/register",
        json={
            "accepts_terms": True,
            "confirms_minimum_age": True,
            "terms_version": LEGAL_TERMS_VERSION,
            "email": email,
            "name": name,
            "password": password,
        },
    )
    assert response.status_code == 201
    return response.json()["user"]


def _stub_reset_mail(monkeypatch) -> list[tuple[str, str]]:
    """Keep the link the app built. Nothing is sent to a mail server."""
    sent: list[tuple[str, str]] = []

    def deliver_now(to_email: str, reset_url: str) -> None:
        sent.append((to_email, reset_url))

    monkeypatch.setattr("app.routers.auth._domain_has_mx", lambda _domain: True)
    monkeypatch.setattr("app.routers.auth.send_welcome_email", lambda *_a, **_k: None)
    monkeypatch.setattr("app.routers.auth.send_forgot_password_email", deliver_now)
    monkeypatch.setattr("app.routers.auth._send_reset_email_in_background", deliver_now)
    monkeypatch.setattr(app_settings, "smtp_host", "smtp.test.local")
    monkeypatch.setattr(app_settings, "smtp_from", "noreply@test.local")
    monkeypatch.setattr(app_settings, "public_base_url", "https://gastodehoy.test")
    return sent


def _reset_token_from_test_db(email: str, sent: list[tuple[str, str]]) -> str:
    """Confirm the link token is the hash stored for this account, then use it."""
    assert len(sent) == 1
    assert sent[0][0] == email
    token = parse_qs(urlparse(sent[0][1]).query)["token"][0]
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        assert user is not None
        assert user.password_reset_hash == hash_reset_token(token)
        assert user.password_reset_expires_at is not None
    return token


def test_register_expense_recover_password_and_isolate(anon_client, monkeypatch) -> None:
    sent = _stub_reset_mail(monkeypatch)

    owner = _register(anon_client, _OWNER_EMAIL, "Owner", _OLD_PASSWORD)
    assert owner["email"] == _OWNER_EMAIL

    created = anon_client.post(
        "/api/expenses",
        json={"amount": _EXPENSE_AMOUNT, "note": _EXPENSE_NOTE},
    )
    assert created.status_code == 200
    expense_id = created.json()["id"]
    assert Decimal(str(created.json()["amount"])) == Decimal(_EXPENSE_AMOUNT)

    assert anon_client.post("/api/auth/logout").status_code == 204

    forgot = anon_client.post(
        "/api/auth/forgot-password",
        json={"email": _OWNER_EMAIL},
    )
    assert forgot.status_code == 200
    token = _reset_token_from_test_db(_OWNER_EMAIL, sent)

    reset = anon_client.post(
        "/api/auth/reset-password",
        json={"token": token, "new_password": _NEW_PASSWORD},
    )
    assert reset.status_code == 200

    old_login = anon_client.post(
        "/api/auth/login",
        json={"email": _OWNER_EMAIL, "password": _OLD_PASSWORD},
    )
    assert old_login.status_code == 401
    new_login = anon_client.post(
        "/api/auth/login",
        json={"email": _OWNER_EMAIL, "password": _NEW_PASSWORD},
    )
    assert new_login.status_code == 200

    own_expenses = anon_client.get("/api/expenses")
    assert own_expenses.status_code == 200
    own_body = own_expenses.json()
    assert own_body["meta"]["total"] == 1
    assert own_body["items"][0]["id"] == expense_id
    assert Decimal(str(own_body["items"][0]["amount"])) == Decimal(_EXPENSE_AMOUNT)
    assert own_body["items"][0]["note"] == _EXPENSE_NOTE

    assert anon_client.post("/api/auth/logout").status_code == 204
    _register(anon_client, _OTHER_EMAIL, "Other", _OLD_PASSWORD)

    other_expenses = anon_client.get("/api/expenses")
    assert other_expenses.status_code == 200
    other_body = other_expenses.json()
    visible_ids = [item["id"] for item in other_body["items"]]
    assert expense_id not in visible_ids
    assert other_body["items"] == []
    assert other_body["meta"]["total"] == 0
    assert _EXPENSE_NOTE not in other_expenses.text

    summary = anon_client.get("/api/summary")
    assert summary.status_code == 200
    assert Decimal(str(summary.json()["variable_spent_month"])) == Decimal("0")
