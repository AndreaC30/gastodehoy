"""Tests for daily notification copy selection."""

from decimal import Decimal

from app.services.notification_message import pick_daily_notification


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


def test_returns_none_when_nothing_positive() -> None:
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
    assert pick_daily_notification(insights, summary) is None
