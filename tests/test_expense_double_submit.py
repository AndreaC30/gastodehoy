"""Identical variable expenses inside a short window stay one row."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.models import VariableExpense


def _count(db_session) -> int:
    db_session.expire_all()
    return db_session.query(VariableExpense).count()


def test_rapid_identical_creates_share_one_row(client, db_session) -> None:
    body = {"amount": "3.50", "note": "café", "occurred_at": "2026-11-08"}
    first = client.post("/api/expenses", json=body)
    second = client.post("/api/expenses", json=body)
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    assert _count(db_session) == 1


def test_blank_and_null_notes_share_one_row(client, db_session) -> None:
    day = {"amount": "3.50", "occurred_at": "2026-11-08"}
    first = client.post("/api/expenses", json={**day, "note": None})
    second = client.post("/api/expenses", json={**day, "note": "   "})
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    assert _count(db_session) == 1


def test_different_note_creates_two_rows(client, db_session) -> None:
    day = {"amount": "3.50", "occurred_at": "2026-11-08"}
    first = client.post("/api/expenses", json={**day, "note": "café"})
    second = client.post("/api/expenses", json={**day, "note": "té"})
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] != second.json()["id"]
    assert _count(db_session) == 2


def test_identical_create_after_window_creates_second_row(
    client, db_session, monkeypatch
) -> None:
    import app.routers.budget as budget

    base = datetime(2026, 11, 8, 12, 0, tzinfo=timezone.utc)
    clock = {"now": base}
    monkeypatch.setattr(budget, "_utcnow", lambda: clock["now"])

    body = {"amount": "3.50", "note": "café", "occurred_at": "2026-11-08"}
    first = client.post("/api/expenses", json=body)
    clock["now"] = base + budget.EXPENSE_DUPLICATE_WINDOW + timedelta(seconds=1)
    second = client.post("/api/expenses", json=body)
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] != second.json()["id"]
    assert _count(db_session) == 2
