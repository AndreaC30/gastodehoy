"""Web Push API tests."""

from pywebpush import WebPushException

from app.config import settings
from app.models import PushSubscription
from app.services.web_push import send_push_payload, send_to_user


def test_push_config_disabled_by_default(client) -> None:
    r = client.get("/api/push/config")
    assert r.status_code == 200
    data = r.json()
    assert data["enabled"] is False
    assert data["public_key"] is None


def test_push_subscribe_requires_auth(anon_client) -> None:
    assert (
        anon_client.post(
            "/api/push/subscribe",
            json={
                "endpoint": "https://push.example/sub/1",
                "keys": {"p256dh": "x", "auth": "y"},
            },
        ).status_code
        == 401
    )


def test_push_subscribe_without_vapid(client) -> None:
    r = client.post(
        "/api/push/subscribe",
        json={
            "endpoint": "https://push.example/sub/1",
            "keys": {"p256dh": "test", "auth": "auth"},
        },
    )
    assert r.status_code == 503


# --- DELETE /api/push/subscribe -----------------------------------------------


def test_push_unsubscribe_requires_auth(anon_client) -> None:
    """DELETE returns 401 for unauthenticated requests."""
    assert anon_client.delete("/api/push/subscribe").status_code == 401


def test_push_unsubscribe_no_subscriptions(client) -> None:
    """DELETE succeeds (204) even when the user has no subscriptions."""
    r = client.delete("/api/push/subscribe")
    assert r.status_code == 204


def test_push_unsubscribe_with_subscriptions(client, db_session, user) -> None:
    """DELETE removes all push subscriptions for the current user."""
    from sqlalchemy import func, select

    from app.models import PushSubscription

    # Create a subscription for the authenticated user
    sub = PushSubscription(
        user_id=user.id,
        endpoint="https://push.example/sub/1",
        p256dh="test-p256dh",
        auth="test-auth",
    )
    db_session.add(sub)
    db_session.commit()

    r = client.delete("/api/push/subscribe")
    assert r.status_code == 204

    count = db_session.scalar(
        select(func.count(PushSubscription.id)).where(
            PushSubscription.user_id == user.id
        )
    )
    assert count == 0


def test_push_unsubscribe_only_own_subscriptions(
    client, db_session, user,
) -> None:
    """DELETE only removes subscriptions belonging to the current user."""
    from sqlalchemy import func, select

    from app.models import PushSubscription

    # Subscription for the current user
    sub_own = PushSubscription(
        user_id=user.id,
        endpoint="https://push.example/sub/own",
        p256dh="p256dh-own",
        auth="auth-own",
    )
    db_session.add(sub_own)
    db_session.commit()

    # Create another user with a subscription
    from tests.conftest import _make_user

    other_user = _make_user(db_session, email="other@example.com")
    sub_other = PushSubscription(
        user_id=other_user.id,
        endpoint="https://push.example/sub/other",
        p256dh="p256dh-other",
        auth="auth-other",
    )
    db_session.add(sub_other)
    db_session.commit()

    r = client.delete("/api/push/subscribe")
    assert r.status_code == 204

    # Own subscriptions should be gone
    own_count = db_session.scalar(
        select(func.count(PushSubscription.id)).where(
            PushSubscription.user_id == user.id
        )
    )
    assert own_count == 0

    # Other user's subscriptions must remain
    other_count = db_session.scalar(
        select(func.count(PushSubscription.id)).where(
            PushSubscription.user_id == other_user.id
        )
    )
    assert other_count == 1


class _Resp:
    def __init__(self, status_code: int) -> None:
        self.status_code = status_code


def test_send_push_payload_keeps_message_for_a_day(monkeypatch) -> None:
    monkeypatch.setattr(settings, "vapid_public_key", "pub")
    monkeypatch.setattr(settings, "vapid_private_key", "priv")
    seen: dict = {}

    def fake_webpush(**kwargs):
        seen.update(kwargs)

    monkeypatch.setattr("app.services.web_push.webpush", fake_webpush)
    sub = PushSubscription(
        user_id=1,
        endpoint="https://push.example/sub/ttl",
        p256dh="p",
        auth="a",
    )
    assert send_push_payload(sub, {"title": "t"}) == "sent"
    assert seen["ttl"] == 86400
    assert seen["headers"]["Urgency"] == "high"


def test_send_push_payload_marks_expired_subscriptions(monkeypatch) -> None:
    monkeypatch.setattr(settings, "vapid_public_key", "pub")
    monkeypatch.setattr(settings, "vapid_private_key", "priv")

    def gone(**_kwargs):
        raise WebPushException("gone", response=_Resp(410))

    monkeypatch.setattr("app.services.web_push.webpush", gone)
    sub = PushSubscription(
        user_id=1,
        endpoint="https://push.example/sub/gone",
        p256dh="p",
        auth="a",
    )
    assert send_push_payload(sub, {"title": "t"}) == "gone"

    def transient(**_kwargs):
        raise WebPushException("down", response=_Resp(500))

    monkeypatch.setattr("app.services.web_push.webpush", transient)
    assert send_push_payload(sub, {"title": "t"}) == "failed"


def test_send_to_user_drops_only_expired_subscriptions(
    db_session, user, monkeypatch
) -> None:
    kept = PushSubscription(
        user_id=user.id,
        endpoint="https://push.example/sub/keep",
        p256dh="p",
        auth="a",
    )
    dropped = PushSubscription(
        user_id=user.id,
        endpoint="https://push.example/sub/drop",
        p256dh="p",
        auth="a",
    )
    db_session.add_all([kept, dropped])
    db_session.commit()

    def fake_send(subscription, _payload):
        if subscription.endpoint.endswith("/drop"):
            return "gone"
        return "failed"

    monkeypatch.setattr("app.services.web_push.send_push_payload", fake_send)
    sent, failed = send_to_user(db_session, user.id, {"title": "t"})
    db_session.commit()
    assert (sent, failed) == (0, 2)
    assert db_session.get(PushSubscription, kept.id) is not None
    assert db_session.get(PushSubscription, dropped.id) is None


def test_confirm_push_requires_auth(anon_client) -> None:
    assert anon_client.post("/api/push/confirm").status_code == 401


def test_confirm_push_without_vapid(client) -> None:
    assert client.post("/api/push/confirm").status_code == 503
