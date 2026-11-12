"""Send the daily Web Push at 20:30 in the app timezone.

The server clock is UTC. Two cron lines cover winter and summer; this
command sends only when the local hour is 20, so just one of them delivers:

    30 18 * * * cd /root/gastodehoy && docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T app python -m app.cli.send_daily_push
    30 19 * * * cd /root/gastodehoy && docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T app python -m app.cli.send_daily_push

Usage:

    python -m app.cli.send_daily_push
    python -m app.cli.send_daily_push --dry-run
    python -m app.cli.send_daily_push --force
"""

from __future__ import annotations

import argparse
import logging
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select

from app.config import settings
from app.database import SessionLocal
from app.models import PushSubscription, User, UserSettings
from app.services.budget import (
    compute_summary,
    has_variable_expense_on,
    month_bounds,
    today_in_app_timezone,
)
from app.services.insights import compute_insights
from app.services.notification_message import pick_daily_notification
from app.services.web_push import send_to_user

_log = logging.getLogger(__name__)

# 20:00–20:59 in TIMEZONE (Europe/Madrid). Cron hits :30.
EVENING_HOUR = 20


def should_send_now(now: datetime) -> bool:
    """True during the 20:xx hour in the app timezone."""
    local = now.astimezone(ZoneInfo(settings.timezone))
    return local.hour == EVENING_HOUR


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Envía el aviso push de las 20:30 a quien está suscrito."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Muestra mensajes sin enviar push.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Envía aunque no sean las 20:30 (hora de la app).",
    )
    args = parser.parse_args()

    if (
        not args.force
        and not args.dry_run
        and not should_send_now(datetime.now(ZoneInfo("UTC")))
    ):
        print("Fuera de las 20:30 (hora de la app). No se envía.")
        return

    if not settings.web_push_enabled():
        sys.exit(
            "VAPID no configurado (VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY). "
            "Genera claves con: npx web-push generate-vapid-keys"
        )

    today = today_in_app_timezone()
    start, end = month_bounds(today)
    sent = 0
    skipped = 0
    failed = 0

    with SessionLocal() as db:
        subs = list(db.scalars(select(PushSubscription).order_by(PushSubscription.id)))
        by_user: dict[int, list[PushSubscription]] = {}
        for sub in subs:
            by_user.setdefault(sub.user_id, []).append(sub)

        for user_id, user_subs in by_user.items():
            user = db.get(User, user_id)
            if user is None:
                continue
            summary = compute_summary(db, user_id, today)
            insights_data = compute_insights(db, user_id, start, end, summary=summary)
            settings_row = db.scalar(
                select(UserSettings).where(UserSettings.user_id == user_id)
            )
            lang = (settings_row.language if settings_row else None) or "es"
            logged_today = has_variable_expense_on(db, user_id, today)
            msg = pick_daily_notification(
                insights_data,
                summary,
                lang=lang,
                logged_today=logged_today,
                user_id=user_id,
                on_date=today,
            )
            if msg is None:
                skipped += 1
                continue
            payload = {
                "title": msg["title"],
                "body": msg["body"],
                "tag": msg["tag"],
            }
            if args.dry_run:
                _log.info("dry-run user=%s tag=%s", user_id, msg["tag"])
                sent += 1
                continue
            s, f = send_to_user(db, user_id, payload)
            sent += s
            failed += f
        db.commit()

    print(f"Push diario: {sent} enviados, {skipped} sin mensaje, {failed} fallidos/expirados.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    main()
