"""Copy for optional daily browser notifications (positive tone only)."""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from app.services.insights import (
    INSIGHT_TYPE_INFO,
    INSIGHT_TYPE_SUCCESS,
)


def pick_daily_notification(
    insights_payload: dict[str, Any],
    summary: dict[str, Any] | None,
    lang: str = "es",
) -> dict[str, str] | None:
    """Pick one encouraging notification from insights and/or budget summary.

    Returns ``None`` when there is nothing positive to say (avoids nagging).
    """
    from app.services.insight_i18n import get_insight_text

    _t = lambda key, **kw: get_insight_text(lang, "notif_" + key, **kw)

    insights = insights_payload.get("insights") or []

    for item in insights:
        if item.get("type") != INSIGHT_TYPE_SUCCESS:
            continue
        return {
            "tag": "gdh-insight-success",
            "title": item["title"],
            "body": item["message"],
        }

    if summary is not None:
        suggested = summary.get("suggested_spend_today")
        if suggested is not None and Decimal(suggested) > 0:
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

    for item in insights:
        if item.get("type") != INSIGHT_TYPE_INFO:
            continue
        title = item.get("title") or ""
        if title == get_insight_text(lang, "daily_limit"):
            return {
                "tag": "gdh-insight-daily",
                "title": _t("daily_limit_title"),
                "body": item["message"],
            }
        if title == get_insight_text(lang, "similar_pace"):
            return {
                "tag": "gdh-insight-steady",
                "title": title,
                "body": item["message"],
            }

    return None
