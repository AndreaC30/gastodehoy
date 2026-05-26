"""Web Push (VAPID) delivery for installed PWAs."""

from __future__ import annotations

import json
import logging
from typing import Any

from pywebpush import WebPushException, webpush
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import PushSubscription

_log = logging.getLogger(__name__)


def send_push_payload(subscription: PushSubscription, payload: dict[str, Any]) -> bool:
    """Send one push. Returns False on expired/invalid subscription."""
    if not settings.web_push_enabled():
        return False
    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
            },
            data=json.dumps(payload, ensure_ascii=False),
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_subject},
        )
        return True
    except WebPushException as exc:
        status = getattr(exc, "response", None)
        code = status.status_code if status is not None else None
        if code in (404, 410):
            _log.info("push subscription gone endpoint=%s", subscription.endpoint[:48])
            return False
        _log.warning("push failed endpoint=%s: %s", subscription.endpoint[:48], exc)
        return False
    except Exception as exc:
        _log.warning("push error: %s", exc)
        return False


def send_to_user(session: Session, user_id: int, payload: dict[str, Any]) -> tuple[int, int]:
    """Send payload to all subscriptions for ``user_id``.

    Returns (success_count, failed_count). Failed/expired subscriptions are
    automatically removed from the database.
    """
    rows = list(
        session.scalars(
            select(PushSubscription).where(PushSubscription.user_id == user_id)
        ).all()
    )
    sent = 0
    failed = 0
    for row in rows:
        if send_push_payload(row, payload):
            sent += 1
        else:
            failed += 1
            if row in session:
                session.delete(row)
    return sent, failed
