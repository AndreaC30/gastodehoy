"""Unexpected failures share one 500 body; HTTP 404 details stay specific."""

from fastapi.testclient import TestClient

from app.auth import SESSION_COOKIE, make_session_token
from app.main import app

_BOOM_PATH = "/api/__test_runtime_error"
_SECRET = "secret-should-not-leak"


def test_runtime_error_is_generic_and_404_detail_unchanged(user) -> None:
    @app.get(_BOOM_PATH)
    def _raise_runtime_error() -> None:
        raise RuntimeError(_SECRET)

    try:
        with TestClient(
            app,
            raise_server_exceptions=False,
            headers={"X-Requested-With": "XMLHttpRequest"},
        ) as client:
            client.cookies.set(SESSION_COOKIE, make_session_token(user.id))

            failed = client.get(_BOOM_PATH)
            assert failed.status_code == 500
            assert failed.json() == {"detail": "Error interno. Inténtalo de nuevo."}
            assert _SECRET not in failed.text
            assert "Traceback" not in failed.text

            missing = client.delete("/api/fixed-expenses/999999")
            assert missing.status_code == 404
            assert missing.json() == {"detail": "Gasto fijo no encontrado"}
    finally:
        app.router.routes[:] = [
            route
            for route in app.router.routes
            if getattr(route, "path", None) != _BOOM_PATH
        ]
