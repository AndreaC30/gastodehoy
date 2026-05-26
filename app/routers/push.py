"""Web Push subscription API."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models import PushSubscription, User
from app.schemas import PushConfigRead, PushSubscribeCreate

router = APIRouter(prefix="/api/push", tags=["push"])


@router.get("/config", response_model=PushConfigRead)
def push_config() -> PushConfigRead:
    """Public VAPID key for ``pushManager.subscribe`` (no auth required)."""
    if not settings.web_push_enabled():
        return PushConfigRead(enabled=False, public_key=None)
    return PushConfigRead(
        enabled=True,
        public_key=settings.vapid_public_key,
    )


@router.post("/subscribe", status_code=204)
def subscribe_push(
    payload: PushSubscribeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    """Store or refresh the browser push subscription for the current user."""
    if not settings.web_push_enabled():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Web Push no configurado en el servidor (VAPID).",
        )
    existing = db.scalar(
        select(PushSubscription).where(PushSubscription.endpoint == payload.endpoint)
    )
    if existing is not None and existing.user_id != user.id:
        db.delete(existing)
        db.flush()
    row = existing if existing and existing.user_id == user.id else None
    if row is None:
        row = PushSubscription(
            user_id=user.id,
            endpoint=payload.endpoint,
            p256dh=payload.keys.p256dh,
            auth=payload.keys.auth,
        )
        db.add(row)
    else:
        row.p256dh = payload.keys.p256dh
        row.auth = payload.keys.auth
    db.commit()


@router.delete("/subscribe", status_code=204)
def unsubscribe_push(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    """Remove all push subscriptions for the current user."""
    rows = db.scalars(
        select(PushSubscription).where(PushSubscription.user_id == user.id)
    ).all()
    for row in rows:
        db.delete(row)
    db.commit()
