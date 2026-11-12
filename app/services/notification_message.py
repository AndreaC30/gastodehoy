"""Copy for optional daily browser notifications (positive tone only)."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

# Fixed evening bank: control / pace / soft debt relief (no coachy nagging).
# Rotation uses user_id + calendar day so the same person sees variety without storage.
_ROTATING_PHRASE_IDS = (
    "control_1",
    "control_2",
    "control_3",
    "pace_1",
    "pace_2",
    "pace_3",
    "relief_1",
    "relief_2",
    "relief_3",
    "relief_4",
    "calm_1",
    "calm_2",
)


def _rotation_seed(user_id: int, on_date: date) -> int:
    return user_id + on_date.toordinal()


def _budget_message(
    summary: dict[str, Any],
    _t,
) -> dict[str, str] | None:
    suggested = summary.get("suggested_spend_today")
    if suggested is None or Decimal(suggested) <= 0:
        return None
    amount = Decimal(suggested).quantize(Decimal("0.01"))
    remaining = summary.get("remaining_this_month")
    if remaining is not None:
        rem = Decimal(remaining).quantize(Decimal("0.01"))
        body = _t("daily_budget_body_remaining", amount=amount, remaining=rem)
    else:
        body = _t("daily_budget_body", amount=amount)
    return {
        "tag": "gdh-daily-budget",
        "title": _t("daily_budget_title"),
        "body": body,
    }


def _rotating_phrase(lang: str, seed: int, _t) -> dict[str, str]:
    phrase_id = _ROTATING_PHRASE_IDS[seed % len(_ROTATING_PHRASE_IDS)]
    return {
        "tag": f"gdh-phrase-{phrase_id}",
        "title": _t(f"{phrase_id}_title"),
        "body": _t(f"{phrase_id}_body"),
    }


def pick_daily_notification(
    insights_payload: dict[str, Any],
    summary: dict[str, Any] | None,
    lang: str = "es",
    *,
    logged_today: bool = True,
    user_id: int = 0,
    on_date: date | None = None,
) -> dict[str, str] | None:
    """Pick one notification for the evening push.

    Priority: ask to log if the day is empty; otherwise alternate margin (when
    available) with a short rotating phrase. ``insights_payload`` is kept for
    callers; the evening push no longer depends on insight cards.
    """
    from app.services.insight_i18n import get_insight_text

    _ = insights_payload  # reserved for future data-aware phrases
    _t = lambda key, **kw: get_insight_text(lang, "notif_" + key, **kw)

    if not logged_today:
        return {
            "tag": "gdh-log-today",
            "title": _t("log_today_title"),
            "body": _t("log_today_body"),
        }

    day = on_date or date.today()
    seed = _rotation_seed(user_id, day)

    # Even seeds: prefer the real daily margin when we have one.
    if seed % 2 == 0 and summary is not None:
        budget = _budget_message(summary, _t)
        if budget is not None:
            return budget

    return _rotating_phrase(lang, seed, _t)


_PUSH_ENABLED = {
    "es": ("Listo", "Puedes cambiarlo en Cuenta cuando quieras."),
    "en": ("Done", "You can change this in Account anytime."),
    "fr": ("C’est fait", "Vous pouvez le modifier dans Compte quand vous voulez."),
    "de": ("Fertig", "Du kannst das jederzeit unter Konto ändern."),
}


def push_enabled_notice(lang: str) -> dict[str, str]:
    """Short ack when this device opts in (no “we will notify you” copy)."""
    title, body = _PUSH_ENABLED.get(lang, _PUSH_ENABLED["es"])
    return {"title": title, "body": body, "tag": "gdh-push-on"}
