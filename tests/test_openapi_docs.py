"""OpenAPI stays available in development and is absent in production."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.config import settings as app_settings
from app.main import app, openapi_docs_kwargs

_DOC_PATHS = ("/openapi.json", "/docs", "/redoc")


def test_development_serves_openapi(monkeypatch) -> None:
    monkeypatch.setattr(app_settings, "environment", "development")
    kwargs = openapi_docs_kwargs()
    assert kwargs == {
        "openapi_url": "/openapi.json",
        "docs_url": "/docs",
        "redoc_url": "/redoc",
    }
    assert app.openapi_url == "/openapi.json"
    assert app.docs_url == "/docs"
    assert app.redoc_url == "/redoc"

    with TestClient(app) as client:
        spec = client.get("/openapi.json")
        assert spec.status_code == 200
        assert spec.json()["openapi"]
        assert client.get("/docs").status_code == 200
        assert client.get("/redoc").status_code == 200


def test_production_hides_openapi(monkeypatch) -> None:
    monkeypatch.setattr(app_settings, "environment", "production")
    kwargs = openapi_docs_kwargs()
    assert kwargs == {"openapi_url": None, "docs_url": None, "redoc_url": None}

    # The imported app was built under the test default (development).
    # A second app takes the production kwargs directly.
    assert app.openapi_url == "/openapi.json"
    with TestClient(FastAPI(**kwargs)) as client:
        for path in _DOC_PATHS:
            assert client.get(path).status_code == 404
