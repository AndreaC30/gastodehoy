"""Tests para autenticación y rate limiting."""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock

from app.auth import (
    check_login_rate,
    reset_login_rate,
    _client_ip,
    _LOGIN_WINDOW_S,
    _LOGIN_MAX_ATTEMPTS,
)
from app.models import LoginAttempt


class TestClientIP:
    """Tests para extracción de IP del cliente."""

    def test_client_ip_from_request(self):
        """Obtiene IP desde request.client.host."""
        mock_request = MagicMock()
        mock_request.client.host = "192.168.1.100"
        mock_request.headers.get.return_value = None
        
        ip = _client_ip(mock_request)
        assert ip == "192.168.1.100"

    def test_client_ip_forwarded(self):
        """Usa X-Forwarded-For cuando trust_forwarded_for está activo."""
        mock_request = MagicMock()
        mock_request.client.host = "10.0.0.1"
        mock_request.headers.get.return_value = "203.0.113.50, 10.0.0.1"
        
        with patch("app.config.settings.trust_forwarded_for", True):
            ip = _client_ip(mock_request)
            assert ip == "203.0.113.50"

    def test_client_ip_unknown(self):
        """Retorna 'unknown' si no hay client."""
        mock_request = MagicMock()
        mock_request.client = None
        mock_request.headers.get.return_value = None
        
        ip = _client_ip(mock_request)
        assert ip == "unknown"


class TestLoginRateLimit:
    """Tests para rate limiting de login."""

    def test_rate_limit_allows_normal_requests(self, db_session):
        """Permite menos de 5 intentos en 5 minutos."""
        mock_request = MagicMock()
        mock_request.client.host = "192.168.1.100"
        mock_request.headers.get.return_value = None
        
        with patch("app.config.settings.environment", "production"):
            # 4 intentos deberían pasar
            for i in range(4):
                check_login_rate(mock_request, db_session)  # No debe levantar excepción

    def test_rate_limit_blocks_after_max(self, db_session):
        """Bloquea después de 5 intentos en 5 minutos."""
        mock_request = MagicMock()
        mock_request.client.host = "192.168.1.100"
        mock_request.headers.get.return_value = None
        
        with patch("app.config.settings.environment", "production"):
            # 5 intentos
            for i in range(5):
                check_login_rate(mock_request, db_session)
            
            # El 6º debería ser bloqueado
            with pytest.raises(Exception) as exc_info:
                check_login_rate(mock_request, db_session)
            
            assert exc_info.value.status_code == 429
            assert "Demasiados intentos" in str(exc_info.value.detail)

    def test_rate_limit_skipped_in_development(self, db_session):
        """No aplica rate limiting en desarrollo."""
        mock_request = MagicMock()
        mock_request.client.host = "192.168.1.100"
        
        with patch("app.config.settings.environment", "development"):
            # 10 intentos deberían pasar en desarrollo
            for i in range(10):
                check_login_rate(mock_request, db_session)  # No debe levantar

    def test_rate_limit_resets_after_success(self, db_session):
        """Reset tras login exitoso."""
        mock_request = MagicMock()
        mock_request.client.host = "192.168.1.100"
        mock_request.headers.get.return_value = None
        
        with patch("app.config.settings.environment", "production"):
            # 5 intentos
            for i in range(5):
                check_login_rate(mock_request, db_session)
            
            # Reset tras éxito
            reset_login_rate(mock_request, db_session)
            
            # Ahora debería permitir de nuevo
            check_login_rate(mock_request, db_session)  # No debe levantar

    def test_rate_limit_per_ip(self, db_session):
        """Rate limiting es por IP, no global."""
        mock_request_ip1 = MagicMock()
        mock_request_ip1.client.host = "192.168.1.100"
        mock_request_ip1.headers.get.return_value = None
        
        mock_request_ip2 = MagicMock()
        mock_request_ip2.client.host = "192.168.1.101"
        mock_request_ip2.headers.get.return_value = None
        
        with patch("app.config.settings.environment", "production"):
            # IP1 hace 5 intentos
            for i in range(5):
                check_login_rate(mock_request_ip1, db_session)
            
            # IP1 debería estar bloqueada
            with pytest.raises(Exception) as exc_info:
                check_login_rate(mock_request_ip1, db_session)
            assert exc_info.value.status_code == 429
            
            # IP2 debería estar libre
            check_login_rate(mock_request_ip2, db_session)  # No debe levantar


class TestLoginAttemptModel:
    """Tests para el modelo LoginAttempt."""

    def test_login_attempt_creation(self, db_session):
        """Crea intentos de login correctamente."""
        now = datetime.now(timezone.utc)
        attempt = LoginAttempt(ip="192.168.1.100", attempted_at=now)
        db_session.add(attempt)
        db_session.commit()
        
        # Verificar que se guardó
        saved = db_session.query(LoginAttempt).filter(
            LoginAttempt.ip == "192.168.1.100"
        ).first()
        assert saved is not None
        assert saved.ip == "192.168.1.100"
