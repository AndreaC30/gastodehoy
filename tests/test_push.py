"""Web Push API tests."""


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
