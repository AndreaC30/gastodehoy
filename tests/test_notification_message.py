"""Tests for daily notification copy selection."""

from decimal import Decimal

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


def test_push_enabled_notice_falls_back_to_spanish() -> None:
    es = push_enabled_notice("es")
    unknown = push_enabled_notice("it")
    assert es["tag"] == "gdh-push-on"
    assert es["title"] == unknown["title"]
    assert "cerrada" in es["body"]
