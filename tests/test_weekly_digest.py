"""Tests for weekly digest computation and CLI behaviour."""

from datetime import date, timedelta
from decimal import Decimal

import pytest

from app.config import settings as app_settings
from app.mail import SMTPNotConfiguredError
from app.services.budget import today_in_app_timezone
from app.services.weekly_digest import build_digest_for_user


def test_build_digest_weekly_spend_and_month_snapshot(db_session, user) -> None:
    today = today_in_app_timezone()
    in_week_a = today - timedelta(days=1)
    in_week_b = today - timedelta(days=3)
    if today.month == 1:
        prev_month_day = date(today.year - 1, 12, 15)
    else:
        prev_month_day = date(today.year, today.month - 1, 15)

    from app.models import VariableExpense

    db_session.add(
        VariableExpense(
            user_id=user.id,
            amount=Decimal("40.00"),
            occurred_at=in_week_b,
            note=None,
        )
    )
    db_session.add(
        VariableExpense(
            user_id=user.id,
            amount=Decimal("15.00"),
            occurred_at=in_week_a,
            note=None,
        )
    )
    db_session.add(
        VariableExpense(
            user_id=user.id,
            amount=Decimal("99.00"),
            occurred_at=prev_month_day,
            note=None,
        )
    )
    db_session.commit()

    digest = build_digest_for_user(db_session, user)

    assert digest["weekly_variable_spent"] == Decimal("55.00")
    assert digest["variable_spent_month"] == Decimal("55.00")
    assert digest["week_start"] == today - timedelta(days=6)
    assert digest["week_end"] == today
    assert "remaining_this_month" in digest
    assert "savings_amount" in digest


def test_send_weekly_digests_exits_without_smtp(monkeypatch) -> None:
    monkeypatch.setattr(app_settings, "smtp_host", None)
    from app.cli import send_weekly_digests

    with pytest.raises(SystemExit) as exc:
        send_weekly_digests.main()
    assert exc.value.code != 0


def test_send_weekly_digest_email_requires_smtp(monkeypatch) -> None:
    from app.mail import send_weekly_digest_email

    monkeypatch.setattr(app_settings, "smtp_host", None)
    with pytest.raises(SMTPNotConfiguredError):
        send_weekly_digest_email(
            "u@e.com",
            "U",
            {
                "week_start": today_in_app_timezone(),
                "week_end": today_in_app_timezone(),
                "weekly_variable_spent": Decimal("0"),
                "variable_spent_month": Decimal("0"),
                "remaining_this_month": Decimal("0"),
                "savings_amount": Decimal("0"),
            },
        )
