"""Tests for daily notification copy selection."""

from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from app.cli.send_daily_push import should_send_now
from app.services.notification_message import pick_daily_notification, push_enabled_notice


def test_prefers_success_insight() -> None:
    insights = {
        "insights": [
            {
                "type": "warning",
                "title": "Alerta",
                "message": "Mal",
            },
            {
                "type": "success",
                "title": "¡Buen ritmo de gasto!",
                "message": "Sigue así.",
            },
        ]
    }
    out = pick_daily_notification(insights, None)
    assert out is not None
    assert out["title"] == "¡Buen ritmo de gasto!"


def test_uses_summary_when_no_success() -> None:
    insights = {"insights": []}
    summary = {
        "suggested_spend_today": Decimal("23.50"),
        "remaining_this_month": Decimal("120.00"),
    }
    out = pick_daily_notification(insights, summary)
    assert out is not None
    assert out["title"] == "Vas bien en GastoDeHoy"
    assert "23.50" in out["body"]


def test_soft_nudge_when_month_is_tight() -> None:
    insights = {
        "insights": [
            {
                "type": "warning",
                "title": "Presupuesto agotado",
                "message": "Mal mes",
            }
        ]
    }
    summary = {"suggested_spend_today": Decimal("0")}
    out = pick_daily_notification(insights, summary)
    assert out is not None
    assert out["tag"] == "gdh-daily-nudge"
    assert "GastoDeHoy" in out["title"]


def test_returns_none_without_summary() -> None:
    insights = {
        "insights": [
            {
                "type": "warning",
                "title": "Presupuesto agotado",
                "message": "Mal mes",
            }
        ]
    }
    assert pick_daily_notification(insights, None) is None


def test_evening_push_runs_at_20_30_madrid() -> None:
    winter = datetime(2026, 1, 15, 19, 30, tzinfo=ZoneInfo("UTC"))
    summer = datetime(2026, 7, 15, 18, 30, tzinfo=ZoneInfo("UTC"))
    morning = datetime(2026, 1, 15, 7, 0, tzinfo=ZoneInfo("UTC"))
    assert should_send_now(winter)
    assert should_send_now(summer)
    assert not should_send_now(morning)


def test_asks_to_log_when_nothing_was_recorded_today() -> None:
    insights = {
        "insights": [
            {
                "type": "success",
                "title": "¡Buen ritmo de gasto!",
                "message": "Sigue así.",
            }
        ]
    }
    out = pick_daily_notification(insights, None, logged_today=False)
    assert out is not None
    assert out["tag"] == "gdh-log-today"
    assert "gastado" in out["title"].lower()
    assert "regístralo" in out["body"].lower()


def test_push_enabled_notice_falls_back_to_spanish() -> None:
    es = push_enabled_notice("es")
    unknown = push_enabled_notice("it")
    assert es["tag"] == "gdh-push-on"
    assert es["title"] == unknown["title"]
    assert es["title"] == "Listo"
    assert "Cuenta" in es["body"]
