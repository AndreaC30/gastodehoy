"""Auth and CSP logs must not keep secrets."""

from __future__ import annotations

import logging
import threading

from app.auth import SESSION_COOKIE
from app.main import _RedactAccessToken
from app.config import settings as app_settings
from app.legal import LEGAL_TERMS_VERSION

_EMAIL = "log-redact@e.com"
_PASSWORD = "pw-DoNotLog-88421"


def test_logs_omit_password_session_cookie_and_reset_token(
    anon_client, monkeypatch, caplog
) -> None:
    """A password, session cookie, or reset token in any app log fails this test."""
    monkeypatch.setattr("app.routers.auth._domain_has_mx", lambda _domain: True)
    monkeypatch.setattr(app_settings, "smtp_host", "smtp.test.local")
    monkeypatch.setattr(app_settings, "smtp_from", "noreply@test.local")
    monkeypatch.setattr(app_settings, "public_base_url", "https://gastodehoy.test")
    monkeypatch.setattr(app_settings, "admin_notify_email", "admin@example.test")

    def welcome_fails(_to_email: str, _name: str) -> None:
        raise RuntimeError(f"welcome {_EMAIL} {_PASSWORD}")

    def admin_mail_fails(_to_email: str, _subject: str, body: str) -> None:
        raise RuntimeError(f"admin {body}")

    monkeypatch.setattr("app.routers.auth.send_welcome_email", welcome_fails)
    monkeypatch.setattr("app.routers.auth.send_email", admin_mail_fails)

    seen: dict[str, str] = {}

    def reset_fails(_to_email: str, reset_url: str) -> None:
        seen["url"] = reset_url
        raise RuntimeError(reset_url)

    csp_token = "cspResetTokenDoNotLog"
    with caplog.at_level(logging.DEBUG, logger="app"):
        registered = anon_client.post(
            "/api/auth/register",
            json={
                "accepts_terms": True,
                "confirms_minimum_age": True,
                "terms_version": LEGAL_TERMS_VERSION,
                "email": _EMAIL,
                "name": "Redact",
                "password": _PASSWORD,
            },
        )
        assert registered.status_code == 201
        logged_in = anon_client.post(
            "/api/auth/login",
            json={"email": _EMAIL, "password": _PASSWORD},
        )
        assert logged_in.status_code == 200
        anon_client.post("/api/auth/logout")

        monkeypatch.setattr(
            "app.routers.auth.send_forgot_password_email", reset_fails
        )
        forgot = anon_client.post(
            "/api/auth/forgot-password", json={"email": _EMAIL}
        )
        assert forgot.status_code == 200
        for thread in threading.enumerate():
            if thread.name == "forgot-password-smtp":
                thread.join(timeout=2)

        report = anon_client.post(
            "/csp-report",
            json={
                "csp-report": {
                    "document-uri": (
                        f"https://gastodehoy.test/reset-password?token={csp_token}"
                    ),
                    "referrer": (
                        f"https://gastodehoy.test/reset-password?token={csp_token}"
                    ),
                    "violated-directive": "script-src 'self'",
                    "blocked-uri": f"https://evil.test/script.js?token={csp_token}",
                    "script-sample": csp_token,
                }
            },
        )
        assert report.status_code == 204

    reset_url = seen["url"]
    token = reset_url.split("token=", 1)[1]
    assert token
    text = caplog.text
    assert "Failed to send welcome email" in text
    assert "admin notification failed" in text
    assert "el envío SMTP falló" in text
    cookies = [
        value
        for value in (
            registered.cookies.get(SESSION_COOKIE),
            logged_in.cookies.get(SESSION_COOKIE),
        )
        if value
    ]
    assert cookies
    assert _PASSWORD not in text
    assert token not in text
    assert reset_url not in text
    assert csp_token not in text
    assert _EMAIL not in text
    for cookie in cookies:
        assert cookie not in text
    assert "script-src" in text


def test_access_log_redacts_reset_token() -> None:
    record = logging.LogRecord(
        name="uvicorn.access",
        level=logging.INFO,
        pathname="",
        lineno=0,
        msg='%s - "%s %s HTTP/%s" %d',
        args=(
            "127.0.0.1:9",
            "GET",
            "/reset-password?token=super-secret&x=1",
            "1.1",
            200,
        ),
        exc_info=None,
    )
    assert _RedactAccessToken().filter(record) is True
    text = record.getMessage()
    assert "super-secret" not in text
    assert "token=redacted" in text
    assert "/reset-password" in text
    assert "x=1" in text
