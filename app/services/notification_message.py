"""Copy for optional daily browser notifications (positive tone only)."""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from app.services.insights import (
    INSIGHT_TYPE_INFO,
    INSIGHT_TYPE_SUCCESS,
    TITLE_DAILY_LIMIT,
    TITLE_SIMILAR_PACE,
)


def pick_daily_notification(
    insights_payload: dict[str, Any],
    summary: dict[str, Any] | None,
) -> dict[str, str] | None:
    """Pick one encouraging notification from insights and/or budget summary.

    Returns ``None`` when there is nothing positive to say (avoids nagging).
    """
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
            body = f"Hoy puedes gastar hasta {amount}€."
            if remaining is not None:
                rem = Decimal(remaining).quantize(Decimal("0.01"))
                body = f"Hoy puedes gastar hasta {amount}€. Te quedan {rem}€ este mes."
            return {
                "tag": "gdh-daily-budget",
                "title": "Vas bien en GastoDeHoy",
                "body": body,
            }

    for item in insights:
        if item.get("type") != INSIGHT_TYPE_INFO:
            continue
        title = item.get("title") or ""
        if title == TITLE_DAILY_LIMIT:
            return {
                "tag": "gdh-insight-daily",
                "title": "Tu tope de hoy",
                "body": item["message"],
            }
        if title == TITLE_SIMILAR_PACE:
            return {
                "tag": "gdh-insight-steady",
                "title": title,
                "body": item["message"],
            }

    return None
