"""Autenticación con cookie firmada y bcrypt."""

from __future__ import annotations

from collections import deque
from datetime import datetime, timezone
from time import monotonic
from typing import Final

import bcrypt
from fastapi import Cookie, Depends, HTTPException, Request, Response, status
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User

PASSWORD_MIN_LEN: Final = 8
PASSWORD_MAX_LEN: Final = 64
NAME_MIN_LEN: Final = 1
NAME_MAX_LEN: Final = 80
SESSION_COOKIE: Final = "gdh_session"

_BCRYPT_MAX_BYTES: Final = 72


def hash_password(password: str) -> str:
    if len(password.encode("utf-8")) > _BCRYPT_MAX_BYTES:
        raise ValueError("password too long for bcrypt")
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    pwd = password.encode("utf-8")
    if len(pwd) > _BCRYPT_MAX_BYTES:
        return False
    try:
        return bcrypt.checkpw(pwd, hashed.encode("utf-8"))
    except ValueError:
        return False


def _serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(settings.app_secret, salt="gastodehoy.session")


def make_session_token(user_id: int) -> str:
    return _serializer().dumps({"uid": user_id})


def decode_session_token(token: str) -> tuple[int, datetime]:
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
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=settings.session_ttl_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        domain=settings.cookie_domain,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=SESSION_COOKIE,
        domain=settings.cookie_domain,
        path="/",
    )


def get_current_user(
    session: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    db: Session = Depends(get_db),
) -> User:
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No has iniciado sesión",
        )
    user_id, issued_at = decode_session_token(session)
    user = db.get(User, user_id)
    if user is None:
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


_LOGIN_WINDOW_S: Final = 5 * 60
_LOGIN_MAX_ATTEMPTS: Final = 5
_login_attempts: dict[str, deque[float]] = {}


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check_login_rate(request: Request) -> None:
    ip = _client_ip(request)
    now = monotonic()
    q = _login_attempts.setdefault(ip, deque())
    while q and now - q[0] > _LOGIN_WINDOW_S:
        q.popleft()
    if len(q) >= _LOGIN_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos. Espera unos minutos.",
        )
    q.append(now)


def reset_login_rate(request: Request) -> None:
    _login_attempts.pop(_client_ip(request), None)
