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
