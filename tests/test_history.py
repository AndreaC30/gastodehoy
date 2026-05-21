"""Tests for monthly history and month-over-month insights."""

from datetime import date
from decimal import Decimal

from app.services.budget import today_in_app_timezone
from app.services.history import compute_month_history
from app.services.budget import month_bounds
from app.services.insights import compute_insights


def test_summary_history_returns_three_months(client, user, db_session) -> None:
    r = client.get("/api/summary/history?months=3")
    assert r.status_code == 200
    data = r.json()
    assert len(data["months"]) == 3
    today = today_in_app_timezone()
    assert data["months"][-1]["year"] == today.year
    assert data["months"][-1]["month"] == today.month


def test_compute_month_history_order(db_session, user) -> None:
    rows = compute_month_history(db_session, user.id, months=3)
    assert len(rows) == 3
    today = today_in_app_timezone()
    assert rows[-1]["year"] == today.year
    assert rows[-1]["month"] == today.month
    assert (rows[0]["year"], rows[0]["month"]) < (
        rows[-1]["year"],
        rows[-1]["month"],
    )


def test_insight_vs_previous_month_more(client, user, db_session) -> None:
    today = today_in_app_timezone()
    start, end = month_bounds(today)
    if start.month == 1:
        prev_ref = date(start.year - 1, 12, 15)
    else:
        prev_ref = date(start.year, start.month - 1, 15)
    prev_start, prev_end = month_bounds(prev_ref)

    client.post(
        "/api/expenses",
        json={"amount": "50.00", "occurred_at": prev_start.isoformat(), "note": None},
    )
    client.post(
        "/api/expenses",
        json={"amount": "200.00", "occurred_at": start.isoformat(), "note": None},
    )

    data = compute_insights(db_session, user.id, start, end)
    titles = [i["title"] for i in data["insights"]]
    assert "Más gasto que el mes pasado" in titles


def test_summary_history_requires_auth(anon_client) -> None:
    assert anon_client.get("/api/summary/history").status_code == 401


def test_summary_history_max_twelve_months(client) -> None:
    r = client.get("/api/summary/history?months=12")
    assert r.status_code == 200
    assert len(r.json()["months"]) == 12


def test_compute_month_history_clamps_months(db_session, user) -> None:
    rows = compute_month_history(db_session, user.id, months=99)
    assert len(rows) == 12


def test_insight_vs_previous_month_less(client, user, db_session) -> None:
    today = today_in_app_timezone()
    start, end = month_bounds(today)
    if start.month == 1:
        prev_ref = date(start.year - 1, 12, 15)
    else:
        prev_ref = date(start.year, start.month - 1, 15)
    prev_start, _ = month_bounds(prev_ref)

    client.post(
        "/api/expenses",
        json={"amount": "200.00", "occurred_at": prev_start.isoformat(), "note": None},
    )
    client.post(
        "/api/expenses",
        json={"amount": "50.00", "occurred_at": start.isoformat(), "note": None},
    )

    data = compute_insights(db_session, user.id, start, end)
    titles = [i["title"] for i in data["insights"]]
    assert "Menos gasto que el mes pasado" in titles
