"""Unhandled failures are logged with request coordinates and nothing secret."""

from __future__ import annotations

import logging

import pytest
from fastapi import Request
from fastapi.testclient import TestClient

from app.main import app

_PROBE = "/__error_log_probe"


def _error_log_text(caplog: pytest.LogCaptureFixture) -> str:
    chunks: list[str] = []
    for record in caplog.records:
        if record.name != "app.error_log":
            continue
        chunks.append(record.getMessage())
        if record.exc_info and record.exc_info[1] is not None:
            chunks.append(str(record.exc_info[1]))
    return "\n".join(chunks)


def test_unhandled_route_logs_context_without_request_secrets(
    caplog: pytest.LogCaptureFixture,
) -> None:
    class ProbeError(RuntimeError):
        pass

    seen: dict[str, str] = {}

    async def probe(request: Request) -> None:
        seen["cookie"] = request.cookies.get("gdh_session", "")
        seen["authorization"] = request.headers.get("authorization", "")
        seen["body"] = (await request.body()).decode()
        seen["query"] = request.url.query
        raise ProbeError("exc-secret-marker")

    app.add_api_route(_PROBE, probe, methods=["POST"], include_in_schema=False)
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            client.cookies.set("gdh_session", "planted-cookie")
            with caplog.at_level(logging.ERROR, logger="app.error_log"):
                response = client.post(
                    f"{_PROBE}?token=reset-token-xyz&email=person@example.com",
                    headers={
                        "X-Request-ID": "rid-1234",
                        "Authorization": "Bearer planted-authorization",
                    },
                    json={
                        "password": "planted-password",
                        "email": "person@example.com",
                    },
                )
    finally:
        app.router.routes[:] = [
            route for route in app.router.routes if getattr(route, "path", None) != _PROBE
        ]

    assert response.status_code == 500
    assert response.text == "Internal Server Error"
    assert seen["cookie"] == "planted-cookie"
    assert "planted-authorization" in seen["authorization"]
    assert "planted-password" in seen["body"]
    assert "person@example.com" in seen["body"]
    assert "reset-token-xyz" in seen["query"]
    text = _error_log_text(caplog)
    assert "ProbeError" in text
    assert "rid-1234" in text
    assert "POST" in text
    assert _PROBE in text
    assert "planted-password" not in text
    assert "planted-cookie" not in text
    assert "planted-authorization" not in text
    assert "person@example.com" not in text
    assert "reset-token-xyz" not in text
    assert "exc-secret-marker" not in text


def test_health_logs_exception_class_without_sql_or_dsn(
    caplog: pytest.LogCaptureFixture, monkeypatch: pytest.MonkeyPatch
) -> None:
    class DatabaseDown(Exception):
        pass

    def broken_session() -> None:
        raise DatabaseDown(
            "SELECT password FROM users; "
            "postgresql://app:secret-dsn@db.internal/gastodehoy "
            "person@example.com reset-token-xyz planted-cookie"
        )

    monkeypatch.setattr("app.main.db.SessionLocal", broken_session)

    with TestClient(app) as client:
        with caplog.at_level(logging.ERROR, logger="app.error_log"):
            response = client.get("/health", headers={"X-Request-ID": "rid-health"})

    assert response.status_code == 503
    assert response.json() == {"status": "degraded", "database": "unreachable"}
    text = _error_log_text(caplog)
    assert "DatabaseDown" in text
    assert "rid-health" in text
    assert "GET" in text
    assert "/health" in text
    assert "SELECT" not in text
    assert "secret-dsn" not in text
    assert "person@example.com" not in text
    assert "reset-token-xyz" not in text
    assert "planted-cookie" not in text
