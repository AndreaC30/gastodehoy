"""User-controlled text stays text: digest HTML is escaped, notes round-trip."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock

from app.config import settings as app_settings
from app.mail import send_weekly_digest_email, send_welcome_email

_SCRIPT = "<script>alert(1)</script>"
_NAME = f"{_SCRIPT}\r\nBcc: injected@example.com"


def _configure_smtp(monkeypatch) -> MagicMock:
    monkeypatch.setattr(app_settings, "smtp_host", "smtp.test.local")
    monkeypatch.setattr(app_settings, "smtp_port", 587)
    monkeypatch.setattr(app_settings, "smtp_from", "noreply@test.local")
    monkeypatch.setattr(app_settings, "smtp_user", None)
    monkeypatch.setattr(app_settings, "smtp_password", None)
    monkeypatch.setattr(app_settings, "smtp_use_ssl", False)
    monkeypatch.setattr(app_settings, "smtp_use_tls", True)
    client = MagicMock()
    client.__enter__.return_value = client
    client.__exit__.return_value = False
    monkeypatch.setattr("app.mail.smtplib.SMTP", MagicMock(return_value=client))
    return client


def test_script_name_and_note_stay_text(client, monkeypatch) -> None:
    smtp = _configure_smtp(monkeypatch)
    today = date(2026, 11, 8)

    send_weekly_digest_email(
        "a@b.co",
        _NAME,
        {
            "week_start": today,
            "week_end": today,
            "weekly_variable_spent": Decimal("1.50"),
            "variable_spent_month": Decimal("2"),
            "remaining_this_month": Decimal("3"),
            "savings_amount": Decimal("4"),
        },
    )
    digest = smtp.send_message.call_args.args[0]
    html = digest.get_body(preferencelist=("html",)).get_content()
    plain = digest.get_body(preferencelist=("plain",)).get_content()
    assert _SCRIPT not in html
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in html
    assert "1,50 €" in html
    assert _SCRIPT in plain
    assert "\r" not in digest["Subject"]
    assert "\n" not in digest["Subject"]

    send_welcome_email("a@b.co", _NAME)
    welcome = smtp.send_message.call_args.args[0]
    assert "\r" not in welcome["Subject"]
    assert "\n" not in welcome["Subject"]
    assert _SCRIPT in welcome.get_content()

    created = client.post(
        "/api/expenses",
        json={"amount": "4.20", "note": _SCRIPT, "occurred_at": "2026-11-08"},
    )
    assert created.status_code == 200
    assert created.json()["note"] == _SCRIPT
    listed = client.get("/api/expenses")
    assert listed.status_code == 200
    assert listed.json()["items"][0]["note"] == _SCRIPT
