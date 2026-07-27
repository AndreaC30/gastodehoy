"""Admin API key protection."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.config import settings
from app.main import MIN_ADMIN_API_KEY_LEN, _require_strong_admin_api_key, app


@pytest.fixture
def admin_key() -> str:
    return "test-admin-api-key-for-tests-only-123456"


def test_admin_stats_open_in_development_without_key(anon_client):
    r = anon_client.get("/api/admin/stats")
    assert r.status_code == 200
    assert "total_users" in r.json()


def test_admin_stats_requires_key_when_configured(admin_key, monkeypatch):
    monkeypatch.setattr(settings, "admin_api_key", admin_key)
    with TestClient(app, headers={"X-Requested-With": "XMLHttpRequest"}) as c:
        assert c.get("/api/admin/stats").status_code == 401
        assert (
            c.get("/api/admin/stats", headers={"X-Admin-Key": admin_key}).status_code
            == 200
        )
        assert (
            c.get("/api/admin/stats", headers={"X-Admin-Key": "wrong-key"}).status_code
            == 401
        )


def test_production_startup_requires_strong_admin_api_key():
    with patch("app.main.app_settings") as mock_settings:
        mock_settings.admin_api_key = None
        with pytest.raises(RuntimeError, match="ADMIN_API_KEY"):
            _require_strong_admin_api_key("test")

        mock_settings.admin_api_key = "short"
        with pytest.raises(RuntimeError, match="demasiado corta"):
            _require_strong_admin_api_key("test")

        mock_settings.admin_api_key = "a" * MIN_ADMIN_API_KEY_LEN
        _require_strong_admin_api_key("test")
