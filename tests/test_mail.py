"""SMTP: timeout and verified TLS. No network."""

from __future__ import annotations

import ssl
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock

from app.config import settings as app_settings
from app.mail import send_email, send_weekly_digest_email


def _configure_smtp(monkeypatch, *, use_ssl: bool) -> None:
    monkeypatch.setattr(app_settings, "smtp_host", "smtp.test.local")
    monkeypatch.setattr(app_settings, "smtp_port", 465 if use_ssl else 587)
    monkeypatch.setattr(app_settings, "smtp_from", "noreply@test.local")
    monkeypatch.setattr(app_settings, "smtp_user", None)
    monkeypatch.setattr(app_settings, "smtp_password", None)
    monkeypatch.setattr(app_settings, "smtp_use_ssl", use_ssl)
    monkeypatch.setattr(app_settings, "smtp_use_tls", not use_ssl)


def _spy_default_context(monkeypatch) -> list[ssl.SSLContext]:
    created: list[ssl.SSLContext] = []
    real = ssl.create_default_context

    def spy(*args, **kwargs):
        ctx = real(*args, **kwargs)
        created.append(ctx)
        return ctx

    monkeypatch.setattr("app.mail.ssl.create_default_context", spy)
    return created


def _install_client(monkeypatch, class_name: str) -> tuple[MagicMock, MagicMock]:
    client = MagicMock()
    client.__enter__.return_value = client
    client.__exit__.return_value = False
    ctor = MagicMock(return_value=client)
    monkeypatch.setattr(f"app.mail.smtplib.{class_name}", ctor)
    return ctor, client


def _assert_verified(ctx: ssl.SSLContext, created: list[ssl.SSLContext]) -> None:
    assert ctx is created[0]
    assert ctx.verify_mode == ssl.CERT_REQUIRED
    assert ctx.check_hostname is True


def test_send_email_starttls_timeout_and_verified_context(monkeypatch) -> None:
    _configure_smtp(monkeypatch, use_ssl=False)
    created = _spy_default_context(monkeypatch)
    ctor, client = _install_client(monkeypatch, "SMTP")

    send_email("a@b.co", "subject", "body")

    assert ctor.call_args.kwargs["timeout"] == 10
    _assert_verified(client.starttls.call_args.kwargs["context"], created)


def test_send_email_ssl_timeout_and_verified_context(monkeypatch) -> None:
    _configure_smtp(monkeypatch, use_ssl=True)
    created = _spy_default_context(monkeypatch)
    ctor, _client = _install_client(monkeypatch, "SMTP_SSL")

    send_email("a@b.co", "subject", "body")

    assert ctor.call_args.kwargs["timeout"] == 10
    _assert_verified(ctor.call_args.kwargs["context"], created)


def test_weekly_digest_uses_smtp_timeout_and_verified_starttls(monkeypatch) -> None:
    _configure_smtp(monkeypatch, use_ssl=False)
    created = _spy_default_context(monkeypatch)
    ctor, client = _install_client(monkeypatch, "SMTP")
    today = date(2026, 11, 8)

    send_weekly_digest_email(
        "a@b.co",
        "Ana",
        {
            "week_start": today,
            "week_end": today,
            "weekly_variable_spent": Decimal("1.50"),
            "variable_spent_month": Decimal("2"),
            "remaining_this_month": Decimal("3"),
            "savings_amount": Decimal("4"),
        },
    )

    assert ctor.call_args.kwargs["timeout"] == 10
    _assert_verified(client.starttls.call_args.kwargs["context"], created)
