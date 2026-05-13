"""HTTP endpoints for authentication.

Register / login / logout use ``HttpOnly`` signed cookies.
``forgot-password`` envía una contraseña temporal por correo (requiere SMTP).
Cambiar contraseña o recuperar invalida sesiones anteriores cuando aplique.
"""

from __future__ import annotations

import logging
import secrets
import socket
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

_log = logging.getLogger(__name__)

from app.auth import (
    PASSWORD_MAX_LEN,
    PASSWORD_MIN_LEN,
    _client_ip,
    check_login_rate,
    clear_session_cookie,
    get_current_user,
    hash_password,
    make_session_token,
    reset_login_rate,
    set_session_cookie,
    verify_password,
)
from app.config import settings
from app.database import get_db
from app.mail import send_forgot_password_email, send_welcome_email
from app.models import User, UserSettings
from app.schemas import (
    ChangePassword,
    DeleteAccount,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    RegisterRequest,
    RegisterResponse,
    UpdateName,
    UserPublic,
)
from app.services.categories import seed_default_categories

router = APIRouter(prefix="/api/auth", tags=["auth"])

_FORGOT_PASSWORD_MESSAGE = (
    "Si existe una cuenta con ese correo, te hemos enviado una contraseña temporal. "
    "Revisa la bandeja de entrada y la carpeta de spam."
)


def _normalize_email(email: str) -> str:
    """Lowercase + trim so logins are case-insensitive."""
    return email.strip().lower()


def _is_valid_email_format(email: str) -> bool:
    """Validacion basica de formato de email antes de tocar la BD."""
    if "@" not in email:
        return False
    local_domain = email.split("@")
    if len(local_domain) != 2:
        return False
    domain = local_domain[1]
    if "." not in domain or len(domain) < 3:
        return False
    return True


def _domain_has_mx(domain: str) -> bool:
    """Check if a domain has MX/A records (can receive email).

    Returns True if the domain resolves, False otherwise.
    Tests can monkeypatch this to skip real DNS lookups.
    """
    try:
        records = socket.getaddrinfo(domain, 0, socket.AF_UNSPEC, socket.SOCK_STREAM)
        return bool(records)
    except (socket.gaierror, OSError):
        return False


def _random_password() -> str:
    """Contraseña temporal segura y dentro del rango de validación."""
    pw = secrets.token_urlsafe(32)
    while len(pw) < PASSWORD_MIN_LEN:
        pw += secrets.token_urlsafe(8)
    if len(pw) > PASSWORD_MAX_LEN:
        return pw[:PASSWORD_MAX_LEN]
    return pw


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> RegisterResponse:
    """Crea la cuenta, fija la cookie de sesión y devuelve el usuario."""
    email = _normalize_email(payload.email)

    # Validar formato de email antes de tocar la BD
    if not _is_valid_email_format(email):
        _log.warning("register: formato invalido desde %s", _client_ip(request))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El formato del email no es válido",
        )

    # Validar que el dominio tiene registros MX
    domain = email.split("@")[-1]
    if not _domain_has_mx(domain):
        _log.warning("register: dominio sin MX '%s' desde %s", domain, _client_ip(request))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El dominio del email no es válido",
        )

    now = datetime.now(timezone.utc).replace(microsecond=0)
    user = User(
        email=email,
        name=payload.name,
        password_hash=hash_password(payload.password),
        password_changed_at=now,
        recovery_hash=None,
        must_change_password=False,
    )
    user.settings = UserSettings()
    db.add(user)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta con ese email",
        ) from e
    db.refresh(user)
    seed_default_categories(db, user.id)
    try:
        send_welcome_email(user.email, user.name)
    except Exception as exc:
        _log.warning("welcome email failed for %s: %s", user.email, exc)
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    set_session_cookie(response, make_session_token(user.id))
    return RegisterResponse(user=UserPublic.model_validate(user))


@router.post("/login", response_model=UserPublic)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> UserPublic:
    """Verify credentials, apply IP rate-limit and set the session cookie."""
    check_login_rate(request, db)
    email = _normalize_email(payload.email)
    user = db.scalar(select(User).where(func.lower(User.email) == email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )
    reset_login_rate(request, db)
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    set_session_cookie(response, make_session_token(user.id))
    return UserPublic.model_validate(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    """Clear the session cookie. Idempotent."""
    clear_session_cookie(response)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> ForgotPasswordResponse:
    """Genera una contraseña nueva y la envía por correo si el usuario existe.

    Sin SMTP configurado responde 503. Misma respuesta 200 para correo
    inexistente (no revelar cuentas). Valida que el dominio del email
    tenga registros MX antes de intentar enviar (anti-abuso SMTP).
    """
    check_login_rate(request, db)
    if not (settings.smtp_host and settings.smtp_host.strip()):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "La recuperación por correo no está disponible: falta configuración SMTP "
                "en el servidor (SMTP_HOST, remitente, credenciales)."
            ),
        )

    email = _normalize_email(payload.email)

    # Validar formato de email antes de tocar la BD ni el DNS
    if not _is_valid_email_format(email):
        _log.warning("forgot-password: formato invalido desde %s", _client_ip(request))
        return ForgotPasswordResponse(detail=_FORGOT_PASSWORD_MESSAGE)

    # Validar que el dominio tiene registros MX (anti-envio a dominios falsos)
    domain = email.split("@")[-1]
    if not _domain_has_mx(domain):
        _log.warning(
            "forgot-password: dominio sin MX '%s' desde %s",
            domain,
            _client_ip(request),
        )
        # Misma respuesta generica — no revelar que el dominio es invalido
        return ForgotPasswordResponse(detail=_FORGOT_PASSWORD_MESSAGE)

    user = db.scalar(select(User).where(func.lower(User.email) == email))

    if user is None:
        return ForgotPasswordResponse(detail=_FORGOT_PASSWORD_MESSAGE)

    temp_pw = _random_password()
    user.password_hash = hash_password(temp_pw)
    user.password_changed_at = datetime.now(timezone.utc).replace(microsecond=0)
    user.recovery_hash = None
    user.must_change_password = True

    try:
        db.flush()
        send_forgot_password_email(email, temp_pw)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se pudo enviar el correo. Inténtalo más tarde o contacta al administrador.",
        ) from exc

    # No llamamos a reset_login_rate: cada solicitud cuenta para el limite,
    # igual que intentos fallidos de login (anti-abuso del correo).

    return ForgotPasswordResponse(detail=_FORGOT_PASSWORD_MESSAGE)


@router.get("/me", response_model=UserPublic)
def me(user: User = Depends(get_current_user)) -> UserPublic:
    """Return the currently-authenticated user (or 401)."""
    return UserPublic.model_validate(user)


@router.patch("/me", response_model=UserPublic)
def update_me(
    payload: UpdateName,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserPublic:
    """Rename the authenticated user."""
    user.name = payload.name
    db.commit()
    db.refresh(user)
    return UserPublic.model_validate(user)


@router.put("/me/password", response_model=UserPublic)
def change_password(
    payload: ChangePassword,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserPublic:
    """Cambia la contraseña.

    Si venías de una contraseña temporal (recuperación por correo), se
    emite una cookie nueva y sigues dentro. Si no, se cierra la sesión
    actual como antes (re-login obligatorio; otras cookies ya eran inválidas).
    """
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña actual incorrecta",
        )
    forced = user.must_change_password
    user.password_hash = hash_password(payload.new_password)
    # Sin microsegundos: el `issued_at` de la cookie (precisión ~segundo) debe
    # quedar alineado con este timestamp para no invalidar la sesión recién emitida.
    user.password_changed_at = datetime.now(timezone.utc).replace(microsecond=0)
    user.must_change_password = False
    db.commit()
    db.refresh(user)
    if forced:
        set_session_cookie(response, make_session_token(user.id))
    else:
        clear_session_cookie(response)
    return UserPublic.model_validate(user)


@router.post("/me/delete", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(
    payload: DeleteAccount,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    """Delete the account (cascade-removes all owned data)."""
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña incorrecta",
        )
    db.delete(user)
    db.commit()
    clear_session_cookie(response)
