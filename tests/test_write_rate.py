"""Logged-in writes share one per-user limit. Reads do not."""

from app.auth import AUTHENTICATED_WRITE_LIMIT
from app.config import settings as app_settings
from app.database import SessionLocal
from app.models import LoginAttempt


def test_authenticated_write_limit_blocks_and_read_stays_open(client, monkeypatch) -> None:
    """Production admits a normal burst, then 429. A later read is still 200."""
    monkeypatch.setattr(app_settings, "environment", "production")

    for i in range(AUTHENTICATED_WRITE_LIMIT):
        created = client.post(
            "/api/expenses",
            json={"amount": "1.00", "note": f"write-{i}"},
        )
        assert created.status_code == 200

    blocked = client.post(
        "/api/expenses",
        json={"amount": "1.00", "note": "over-limit"},
    )
    assert blocked.status_code == 429

    assert client.get("/api/expenses").status_code == 200

    with SessionLocal() as db:
        assert db.query(LoginAttempt).count() == 0
