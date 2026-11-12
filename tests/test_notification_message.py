"""Tests for daily notification copy selection."""

from datetime import date, datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from app.cli.send_daily_push import should_send_now
from app.services.notification_message import pick_daily_notification, push_enabled_notice


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
    out = pick_daily_notification(
        insights,
        {"suggested_spend_today": Decimal("10")},
        logged_today=False,
        user_id=1,
        on_date=date(2026, 11, 13),
    )
    assert out is not None
    assert out["tag"] == "gdh-log-today"
    assert "gastado" in out["title"].lower()
    assert "regístralo" in out["body"].lower()


def test_even_seed_uses_budget_when_available() -> None:
    # user_id + ordinal even → prefer margin
    day = date(2026, 1, 1)  # ordinal odd-ish; pick user so seed is even
    user_id = day.toordinal() % 2  # makes seed even
    summary = {
        "suggested_spend_today": Decimal("23.50"),
        "remaining_this_month": Decimal("120.00"),
    }
    out = pick_daily_notification(
        {"insights": []},
        summary,
        user_id=user_id,
        on_date=day,
    )
    assert out is not None
    assert out["tag"] == "gdh-daily-budget"
    assert out["title"] == "Vas bien en GastoDeHoy"
    assert "23.50" in out["body"]


def test_odd_seed_uses_rotating_phrase() -> None:
    day = date(2026, 1, 1)
    user_id = (day.toordinal() % 2) + 1  # seed odd
    out = pick_daily_notification(
        {"insights": []},
        {"suggested_spend_today": Decimal("23.50")},
        user_id=user_id,
        on_date=day,
    )
    assert out is not None
    assert out["tag"].startswith("gdh-phrase-")
    assert out["title"]
    assert out["body"]


def test_phrase_rotates_by_day_for_same_user() -> None:
    a = pick_daily_notification(
        {"insights": []},
        None,
        user_id=7,
        on_date=date(2026, 3, 1),
    )
    b = pick_daily_notification(
        {"insights": []},
        None,
        user_id=7,
        on_date=date(2026, 3, 2),
    )
    assert a is not None and b is not None
    assert a["tag"] != b["tag"] or a["body"] != b["body"]


def test_no_budget_falls_back_to_phrase() -> None:
    day = date(2026, 1, 1)
    user_id = day.toordinal() % 2  # even seed, but no positive margin
    out = pick_daily_notification(
        {"insights": []},
        {"suggested_spend_today": Decimal("0")},
        user_id=user_id,
        on_date=day,
    )
    assert out is not None
    assert out["tag"].startswith("gdh-phrase-")


def test_evening_push_runs_at_20_30_madrid() -> None:
    winter = datetime(2026, 1, 15, 19, 30, tzinfo=ZoneInfo("UTC"))
    summer = datetime(2026, 7, 15, 18, 30, tzinfo=ZoneInfo("UTC"))
    morning = datetime(2026, 1, 15, 7, 0, tzinfo=ZoneInfo("UTC"))
    assert should_send_now(winter)
    assert should_send_now(summer)
    assert not should_send_now(morning)


def test_push_enabled_notice_falls_back_to_spanish() -> None:
    es = push_enabled_notice("es")
    unknown = push_enabled_notice("it")
    assert es["tag"] == "gdh-push-on"
    assert es["title"] == unknown["title"]
    assert es["title"] == "Listo"
    assert "Cuenta" in es["body"]
