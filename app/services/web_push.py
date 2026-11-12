"""Web Push (VAPID) delivery for installed PWAs."""

from __future__ import annotations

import json
import logging
from typing import Any, Literal

from pywebpush import WebPushException, webpush
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import PushSubscription

_log = logging.getLogger(__name__)

# Keep the message for a day if the phone is offline at send time.
# pywebpush's default ttl is 0, which drops the push unless the browser
# is connected at that exact moment.
PUSH_TTL_SECONDS = 86400

PushSendResult = Literal["sent", "gone", "failed"]


def send_push_payload(subscription: PushSubscription, payload: dict[str, Any]) -> PushSendResult:
    """Send one push.

    ``gone`` means the browser dropped the subscription (404/410).
    ``failed`` is a transient or local error: the row must stay.
    """
    if not settings.web_push_enabled():
        return "failed"
    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
            },
            data=json.dumps(payload, ensure_ascii=False),
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_subject},
            ttl=PUSH_TTL_SECONDS,
            headers={"Urgency": "high"},
        )
        return "sent"
    except WebPushException as exc:
        status = getattr(exc, "response", None)
        code = status.status_code if status is not None else None
        if code in (404, 410):
            _log.info("push subscription gone endpoint=%s", subscription.endpoint[:48])
            return "gone"
        _log.warning("push failed endpoint=%s: %s", subscription.endpoint[:48], exc)
        return "failed"
    except Exception as exc:
        _log.warning("push error: %s", exc)
        return "failed"


def send_to_user(session: Session, user_id: int, payload: dict[str, Any]) -> tuple[int, int]:
    """Send payload to all subscriptions for ``user_id``.

    Returns (success_count, failed_count). Only a ``gone`` result removes
    the subscription. A network or server error keeps it for the next send.
    """
    rows = list(
        session.scalars(
            select(PushSubscription).where(PushSubscription.user_id == user_id)
        ).all()
    )
    sent = 0
    failed = 0
    for row in rows:
        result = send_push_payload(row, payload)
        if result == "sent":
            sent += 1
            continue
        failed += 1
        if result == "gone" and row in session:
            session.delete(row)
    return sent, failed
