"""Send daily positive Web Push notifications to subscribed users.

Requires VAPID keys in the environment. Schedule with cron, e.g. 9:00:

    0 9 * * * cd /app && python -m app.cli.send_daily_push

Usage:

    python -m app.cli.send_daily_push
    python -m app.cli.send_daily_push --dry-run
"""

from __future__ import annotations

import argparse
import logging
import sys

from sqlalchemy import select

from app.config import settings
from app.database import SessionLocal
from app.models import PushSubscription, User
from app.services.budget import compute_summary, month_bounds, today_in_app_timezone
from app.services.insights import compute_insights
from app.services.notification_message import pick_daily_notification
from app.services.web_push import send_to_user

_log = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Envía notificación push diaria (mensaje positivo) a suscriptores."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Muestra mensajes sin enviar push.",
    )
    args = parser.parse_args()

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
            msg = pick_daily_notification(insights_data, summary)
            if msg is None:
                skipped += 1
                continue
            payload = {
                "title": msg["title"],
                "body": msg["body"],
                "tag": msg["tag"],
            }
            if args.dry_run:
                _log.info("dry-run user=%s: %s — %s", user.email, msg["title"], msg["body"])
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
