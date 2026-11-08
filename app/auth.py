"""Authentication primitives.

Password hashing (bcrypt), session cookies signed with itsdangerous,
recovery-code helpers for the admin CLI, ``get_current_user`` dependency,
and a persistent SQLite-backed rate limiter for login, register,
forgot-password and reset-password (per IP and per email).
"""

from __future__ import annotations

import hashlib
import hmac
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
from app.models import LoginAttempt, RevokedSession, User

PASSWORD_MIN_LEN: Final = 8
PASSWORD_MAX_LEN: Final = 64
NAME_MIN_LEN: Final = 1
NAME_MAX_LEN: Final = 80
SESSION_COOKIE: Final = "gdh_session"

_BCRYPT_MAX_BYTES: Final = 72
RESET_TOKEN_TTL: Final = timedelta(hours=1)

# Hash fijo para comparar bcrypt cuando el email no existe. Sin esto, el
# login responde antes y delata qué correos están registrados.
_DUMMY_PASSWORD_HASH: Final[str] = bcrypt.hashpw(
    b"not-a-real-password", bcrypt.gensalt()
).decode("utf-8")

# Alfabeto sin caracteres ambiguos al copiar a mano (sin 0/O, 1/I/L).
_RECOVERY_ALPHABET: Final = "abcdefghjkmnpqrstuvwxyz23456789"
RECOVERY_CODE_GROUPS: Final = 4
RECOVERY_CODE_GROUP_LEN: Final = 4

# Rate limiter constants
_LOGIN_WINDOW_S: Final = 5 * 60
_LOGIN_MAX_ATTEMPTS: Final = 5


def password_exceeds_bcrypt(password: str) -> bool:
    """True when UTF-8 length is past bcrypt's 72-byte input limit."""
    return len(password.encode("utf-8")) > _BCRYPT_MAX_BYTES


def hash_password(password: str) -> str:
    """Return a bcrypt hash for the given plaintext password."""
    if password_exceeds_bcrypt(password):
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


def verify_password_or_dummy(password: str, hashed: str | None) -> bool:
    """Run bcrypt even when the account does not exist.

    ``hashed is None`` compares against a dummy hash so unknown emails
    cost the same as a wrong password.
    """
    return verify_password(password, hashed if hashed is not None else _DUMMY_PASSWORD_HASH)


def hash_reset_token(token: str) -> str:
    """SHA-256 hex of a reset token. The raw token is only emailed once."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def reset_tokens_match(token: str, stored_hash: str) -> bool:
    return hmac.compare_digest(hash_reset_token(token), stored_hash)


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
    """Build a signed cookie value with ``user_id``, a random ``sid`` and issued-at."""
    return _serializer().dumps({"uid": user_id, "sid": secrets.token_urlsafe(32)})


def decode_session_token(token: str) -> tuple[int, datetime, str | None]:
    """Decode a session token; raise 401 on bad signature or expiry.

    Returns ``(user_id, issued_at, sid)``. ``sid`` is None when the cookie was
    minted before session ids existed. ``issued_at`` is forced to UTC because
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
    sid = data.get("sid") if isinstance(data, dict) else None
    if not isinstance(uid, int) or (sid is not None and not isinstance(sid, str)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida",
        )
    if sid == "":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida",
        )
    if issued_at.tzinfo is None:
        issued_at = issued_at.replace(tzinfo=timezone.utc)
    return uid, issued_at, sid


def revoke_session_id(db: Session, sid: str) -> None:
    """Remember ``sid`` as logged out and drop revocations older than the cookie TTL."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=settings.session_ttl_days)
    db.query(RevokedSession).filter(RevokedSession.revoked_at < cutoff).delete(
        synchronize_session=False
    )
    if db.get(RevokedSession, sid) is None:
        db.add(RevokedSession(sid=sid, revoked_at=datetime.now(timezone.utc)))
    db.commit()


def revoke_session_from_cookie(db: Session, token: str) -> None:
    """Revoke the session id inside ``token`` when the cookie decodes.

    Garbage, expired, and pre-``sid`` cookies are ignored so logout can still
    answer 204. Only this cookie's id is stored.
    """
    try:
        _user_id, _issued_at, sid = decode_session_token(token)
    except HTTPException:
        return
    if not sid:
        return
    revoke_session_id(db, sid)


def session_is_revoked(db: Session, sid: str) -> bool:
    """True when logout stored this id. A missing row means the session is valid."""
    return db.get(RevokedSession, sid) is not None


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
    cookie minted before a password reset is invalidated. A missing ``sid``
    (cookies from before per-session logout) and a revoked ``sid`` are 401.
    """
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No has iniciado sesión",
        )
    user_id, issued_at, sid = decode_session_token(session)
    if not sid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida o caducada",
        )
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
    if session_is_revoked(db, sid):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida o caducada",
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
    ``TRUST_FORWARDED_FOR=true`` only behind one reverse proxy that
    *appends* the peer address (nginx ``$proxy_add_x_forwarded_for``).
    The rightmost valid address is the one the proxy added; earlier
    values are whatever the client sent and must not be trusted.
    """
    if settings.trust_forwarded_for:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            parts = [part.strip() for part in fwd.split(",") if part.strip()]
            for candidate in reversed(parts):
                if _is_valid_ip(candidate):
                    return candidate
    return request.client.host if request.client else "unknown"


def _cleanup_old_attempts_db(db: Session, window_s: int) -> None:
    """Remove login attempts older than the rate-limit window."""
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=window_s)
    db.query(LoginAttempt).filter(LoginAttempt.attempted_at < cutoff).delete(
        synchronize_session=False
    )


def _normalize_rate_email(email: str | None) -> str | None:
    """Lowercase and trim. Empty input does not join the email bucket."""
    if email is None:
        return None
    normalized = email.strip().lower()
    return normalized or None


def _email_hint(email: str) -> str:
    """Short HMAC so rate-limit logs can be correlated without the raw email."""
    mac = hmac.new(
        settings.app_secret.encode("utf-8"),
        email.encode("utf-8"),
        hashlib.sha256,
    )
    return mac.hexdigest()[:12]


def _recent_attempt_count(
    db: Session,
    *,
    cutoff: datetime,
    ip: str | None = None,
    email: str | None = None,
) -> int:
    stmt = select(func.count(LoginAttempt.id)).where(LoginAttempt.attempted_at >= cutoff)
    if ip is not None:
        stmt = stmt.where(LoginAttempt.ip == ip)
    if email is not None:
        stmt = stmt.where(LoginAttempt.email == email)
    return db.scalar(stmt) or 0


def check_login_rate(
    request: Request,
    db: Session,
    email: str | None = None,
) -> None:
    """Raise 429 when this IP or email already has 5 failures in 5 minutes.

    Does not insert a row. Development skips the limit so the test suite can
    opt in by setting production. In production, rows older than the window
    are deleted on every check; rows still inside the window stay and count.
    """
    if settings.environment == "development":
        # Local and tests. Production compose sets ENV=production; startup
        # logs a warning when this skip is active.
        return

    ip = _client_ip(request)
    normalized = _normalize_rate_email(email)
    now = datetime.now(timezone.utc)

    _cleanup_old_attempts_db(db, _LOGIN_WINDOW_S)
    db.commit()

    cutoff = now - timedelta(seconds=_LOGIN_WINDOW_S)
    ip_count = _recent_attempt_count(db, cutoff=cutoff, ip=ip)
    email_count = 0
    if normalized is not None:
        email_count = _recent_attempt_count(db, cutoff=cutoff, email=normalized)

    if ip_count >= _LOGIN_MAX_ATTEMPTS or email_count >= _LOGIN_MAX_ATTEMPTS:
        _log.warning(
            "rate-limit: IP %s blocked (%d ip / %d email attempts in %ds, email_hint=%s)",
            ip,
            ip_count,
            email_count,
            _LOGIN_WINDOW_S,
            _email_hint(normalized) if normalized is not None else "-",
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos. Espera unos minutos.",
        )


def record_login_failure(
    request: Request,
    db: Session,
    email: str | None = None,
) -> None:
    """Store one failure for this IP and optional normalized email.

    No-op in development. Does not delete older rows. Login calls this only
    after a bad password or unknown email. Register, forgot-password and
    reset-password call it for every request that passed the check, including
    later successes, so those routes stay capped at 5 per 5 minutes.
    """
    if settings.environment == "development":
        return

    db.add(
        LoginAttempt(
            ip=_client_ip(request),
            email=_normalize_rate_email(email),
            attempted_at=datetime.now(timezone.utc),
        )
    )
    db.commit()
