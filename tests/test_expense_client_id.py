"""client_id: a retried or offline-queued expense is created only once."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.models import VariableExpense

KEY = "3f8c2d1e-9a4b-4c7d-8e21-5b6a7c8d9e0f"
BODY = {"amount": "3.50", "note": "café", "occurred_at": "2026-11-08"}


def _count(db_session) -> int:
    db_session.expire_all()
    return db_session.query(VariableExpense).count()


def _after_window(monkeypatch) -> None:
    """Move the app clock past the short duplicate window."""
    import app.routers.budget as budget

    later = datetime.now(timezone.utc) + budget.EXPENSE_DUPLICATE_WINDOW + timedelta(
        minutes=5
    )
    monkeypatch.setattr(budget, "_utcnow", lambda: later)


def test_same_client_id_after_the_window_does_not_duplicate(
    client, db_session, monkeypatch
) -> None:
    first = client.post("/api/expenses", json={**BODY, "client_id": KEY})
    _after_window(monkeypatch)
    # Same key, even with a different body: the first expense wins.
    second = client.post(
        "/api/expenses", json={**BODY, "amount": "9.99", "client_id": KEY}
    )
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    assert second.json()["amount"] == first.json()["amount"]
    assert _count(db_session) == 1


def test_different_client_ids_after_the_window_create_two_rows(
    client, db_session, monkeypatch
) -> None:
    first = client.post("/api/expenses", json={**BODY, "client_id": KEY})
    _after_window(monkeypatch)
    second = client.post(
        "/api/expenses", json={**BODY, "client_id": KEY.replace("3f8c", "4a9d")}
    )
    assert first.json()["id"] != second.json()["id"]
    assert _count(db_session) == 2


def test_requests_without_client_id_still_work(client, db_session) -> None:
    res = client.post("/api/expenses", json=BODY)
    assert res.status_code == 200
    assert _count(db_session) == 1


def test_client_id_is_scoped_to_the_user(client, db_session) -> None:
    from fastapi.testclient import TestClient

    from app.auth import SESSION_COOKIE, make_session_token
    from app.main import app
    from tests.conftest import _make_user

    first = client.post("/api/expenses", json={**BODY, "client_id": KEY})
    other = _make_user(db_session, email="otra@example.com", name="Otra")
    with TestClient(app, headers={"X-Requested-With": "XMLHttpRequest"}) as c2:
        c2.cookies.set(SESSION_COOKIE, make_session_token(other.id))
        # Same key for another user is their own expense, never the first user's.
        second = c2.post("/api/expenses", json={**BODY, "client_id": KEY})
    assert second.status_code == 200
    assert second.json()["id"] != first.json()["id"]
    assert _count(db_session) == 2


def test_invalid_client_id_is_rejected(client) -> None:
    for bad in ("corto", "con espacios en la clave", "x" * 65, "a;b-c_d12345"):
        res = client.post("/api/expenses", json={**BODY, "client_id": bad})
        assert res.status_code == 422, bad


def test_race_on_the_unique_index_returns_the_first_row(
    client, db_session, monkeypatch
) -> None:
    import app.routers.budget as budget
    from app.database import engine

    with engine.begin() as conn:
        conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ux_variable_expenses_user_client "
                "ON variable_expenses(user_id, client_id) WHERE client_id IS NOT NULL"
            )
        )
    first = client.post("/api/expenses", json={**BODY, "client_id": KEY})
    assert first.status_code == 200

    real = budget._find_expense_by_client_id
    calls = {"n": 0}

    def blind_first_lookup(db, user_id, client_id):
        calls["n"] += 1
        return None if calls["n"] == 1 else real(db, user_id, client_id)

    monkeypatch.setattr(budget, "_find_expense_by_client_id", blind_first_lookup)
    _after_window(monkeypatch)
    try:
        second = client.post("/api/expenses", json={**BODY, "client_id": KEY})
        assert second.status_code == 200
        assert second.json()["id"] == first.json()["id"]
        assert _count(db_session) == 1
    finally:
        with engine.begin() as conn:
            conn.execute(text("DROP INDEX IF EXISTS ux_variable_expenses_user_client"))
