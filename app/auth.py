"""Authentication primitives.

Password hashing (bcrypt), session cookies signed with itsdangerous,
recovery-code helpers for the admin CLI, ``get_current_user`` dependency,
and a persistent SQLite-backed IP rate limiter for login and forgot-password.
"""

from __future__ import annotations

import ipaddress
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Final

_log = logging.getLogger(__name__)

import bcrypt
from fastapi import Cookie, Depends, HTTPException, Request, Response, status
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import LoginAttempt, User

PASSWORD_MIN_LEN: Final = 8
PASSWORD_MAX_LEN: Final = 64
NAME_MIN_LEN: Final = 1
NAME_MAX_LEN: Final = 80
SESSION_COOKIE: Final = "gdh_session"

_BCRYPT_MAX_BYTES: Final = 72

# Alfabeto sin caracteres ambiguos al copiar a mano (sin 0/O, 1/I/L).
_RECOVERY_ALPHABET: Final = "abcdefghjkmnpqrstuvwxyz23456789"
RECOVERY_CODE_GROUPS: Final = 4
RECOVERY_CODE_GROUP_LEN: Final = 4

# Rate limiter constants
_LOGIN_WINDOW_S: Final = 5 * 60
_LOGIN_MAX_ATTEMPTS: Final = 5
_LOGIN_MAX_ENTRIES: Final = 10000


def hash_password(password: str) -> str:
    """Return a bcrypt hash for the given plaintext password."""
    if len(password.encode("utf-8")) > _BCRYPT_MAX_BYTES:
        raise ValueError("password too long for bcrypt")
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Constant-time check of ``password`` against a bcrypt hash."""
    pwd = password.encode("utf-8")
    if len(pwd) > _BCRYPT_MAX_BYTES:
        return False
    try:
        return bcrypt.checkpw(pwd, hashed.encode("utf-8"))
    except ValueError:
        return False


def generate_recovery_code() -> str:
    """Generate ``gdh-XXXX-XXXX-XXXX-XXXX`` with ~80 bits of entropy.

    Uses a custom alphabet that drops visually ambiguous characters
    (``0/O``, ``1/I/L``) so users can hand-copy the code reliably.
    """
    groups = [
        "".join(
            secrets.choice(_RECOVERY_ALPHABET) for _ in range(RECOVERY_CODE_GROUP_LEN)
        )
        for _ in range(RECOVERY_CODE_GROUPS)
    ]
    return "gdh-" + "-".join(groups)


def normalize_recovery_code(code: str) -> str:
    """Accept whatever the user pastes: tolerate dashes, case and spaces."""
    s = "".join(ch for ch in code.strip().lower() if ch.isalnum())
    return s


def hash_recovery_code(code: str) -> str:
    """Bcrypt-hash a recovery code (after normalising it)."""
    return bcrypt.hashpw(
        normalize_recovery_code(code).encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")


def verify_recovery_code(code: str, hashed: str | None) -> bool:
    """Constant-time check of a user-supplied code against a stored hash."""
    if not hashed:
        return False
    norm = normalize_recovery_code(code).encode("utf-8")
    try:
        return bcrypt.checkpw(norm, hashed.encode("utf-8"))
    except ValueError:
        return False


def _serializer() -> URLSafeTimedSerializer:
    """Internal: serializer keyed by ``APP_SECRET`` for the session cookie."""
    return URLSafeTimedSerializer(settings.app_secret, salt="gastodehoy.session")


def make_session_token(user_id: int) -> str:
    """Build a signed cookie value embedding ``user_id`` and an issued-at."""
    return _serializer().dumps({"uid": user_id})


def decode_session_token(token: str) -> tuple[int, datetime]:
    """Decode a session token; raise 401 on bad signature or expiry.

    Returns ``(user_id, issued_at)``. ``issued_at`` is forced to UTC because
    ``itsdangerous`` may yield a naive datetime depending on the version.
    """
    max_age = settings.session_ttl_days * 24 * 60 * 60
    try:
        data, issued_at = _serializer().loads(
            token, max_age=max_age, return_timestamp=True
        )
    except (SignatureExpired, BadSignature) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida o caducada",
        ) from e
    uid = data.get("uid") if isinstance(data, dict) else None
    if not isinstance(uid, int):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida",
        )
    if issued_at.tzinfo is None:
        issued_at = issued_at.replace(tzinfo=timezone.utc)
    return uid, issued_at


def set_session_cookie(response: Response, token: str) -> None:
    """Attach the signed session cookie (HttpOnly, Lax, Secure in prod).

    Also clears any old cookie that had an explicit domain (from before
    we removed the domain parameter) so stale cookies don't accumulate
    on Android/iOS PWAs.
    """
    # Purge old cookie that had an explicit domain
    if settings.cookie_domain:
        response.delete_cookie(
            key=SESSION_COOKIE,
            domain=settings.cookie_domain,
            path="/",
        )
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=settings.session_ttl_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    """Tell the browser to drop the session cookie (logout / reset).

    Clears both the current host-only cookie and any legacy cookie that
    had an explicit domain (from before the domain-removal fix).
    """
    response.delete_cookie(
        key=SESSION_COOKIE,
        path="/",
    )
    if settings.cookie_domain:
        response.delete_cookie(
            key=SESSION_COOKIE,
            domain=settings.cookie_domain,
            path="/",
        )


def get_current_user(
    response: Response,
    session: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    db: Session = Depends(get_db),
) -> User:
    """FastAPI dependency: resolve the authenticated ``User`` or 401.

    Also enforces the "issued before password change" check so that any
    cookie minted before a password reset is invalidated.
    """
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No has iniciado sesión",
        )
    user_id, issued_at = decode_session_token(session)
    user = db.get(User, user_id)
    if user is None:
        clear_session_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cuenta no encontrada",
        )
    if user.password_changed_at:
        pwd_changed = user.password_changed_at
        if pwd_changed.tzinfo is None:
            pwd_changed = pwd_changed.replace(tzinfo=timezone.utc)
        if issued_at < pwd_changed:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sesión invalidada por cambio de contraseña",
            )
    return user


def _is_valid_ip(ip: str) -> bool:
    """Validate that a string is a plausible IPv4 or IPv6 address."""
    try:
        ipaddress.ip_address(ip)
        return True
    except ValueError:
        return False


def _client_ip(request: Request) -> str:
    """Client IP for rate limiting.

    By default uses the TCP peer (safe on direct uvicorn). Set
    ``TRUST_FORWARDED_FOR=true`` only behind a reverse proxy that sets
    ``X-Forwarded-For`` correctly.
    """
    if settings.trust_forwarded_for:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            candidate = fwd.split(",")[0].strip()
            if _is_valid_ip(candidate):
                return candidate
    return request.client.host if request.client else "unknown"


def _cleanup_old_attempts_db(db: Session, window_s: int) -> None:
    """Remove login attempts older than the rate-limit window."""
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=window_s)
    db.query(LoginAttempt).filter(LoginAttempt.attempted_at < cutoff).delete(
        synchronize_session=False
    )


def check_login_rate(request: Request, db: Session) -> None:
    """Throttle login/forgot-password attempts: 5 per IP per 5 minutes -> 429.

    Uses SQLite-backed storage so rate limits survive restarts and work
    across multiple workers.
    """
    if settings.environment == "development":
        return

    ip = _client_ip(request)
    now = datetime.now(timezone.utc)

    # Periodic cleanup to bound table size
    total = db.scalar(select(func.count(LoginAttempt.id))) or 0
    if total > _LOGIN_MAX_ENTRIES:
        _cleanup_old_attempts_db(db, _LOGIN_WINDOW_S)

    # Count attempts in the current window
    cutoff = now - timedelta(seconds=_LOGIN_WINDOW_S)
    recent_count = db.scalar(
        select(func.count(LoginAttempt.id)).where(
            LoginAttempt.ip == ip,
            LoginAttempt.attempted_at >= cutoff,
        )
    ) or 0

    if recent_count >= _LOGIN_MAX_ATTEMPTS:
        _log.warning(
            "rate-limit: IP %s blocked (%d attempts in %ds)",
            ip, recent_count, _LOGIN_WINDOW_S,
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos. Espera unos minutos.",
        )

    # Record this attempt
    db.add(LoginAttempt(ip=ip, attempted_at=now))
    db.commit()


def reset_login_rate(request: Request, db: Session) -> None:
    """Forget previous failures for this IP after a successful auth."""
    ip = _client_ip(request)
    db.query(LoginAttempt).filter(LoginAttempt.ip == ip).delete(
        synchronize_session=False
    )
    db.commit()
