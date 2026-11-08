"""HTTP endpoints for authentication.

Register / login / logout use ``HttpOnly`` signed cookies.
``forgot-password`` envía un enlace de un solo uso (requiere SMTP).
La contraseña no cambia hasta ``reset-password``. Cambiarla invalida sesiones.
"""

from __future__ import annotations

import logging
import secrets
import socket
from datetime import datetime, timezone
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

_log = logging.getLogger(__name__)

from app.auth import (
    PASSWORD_MAX_LEN,
    PASSWORD_MIN_LEN,
    RESET_TOKEN_TTL,
    _client_ip,
    check_login_rate,
    clear_session_cookie,
    get_current_user,
    hash_password,
    hash_reset_token,
    make_session_token,
    password_exceeds_bcrypt,
    record_login_failure,
    reset_tokens_match,
    set_session_cookie,
    verify_password,
    verify_password_or_dummy,
)
from app.config import settings
from app.database import get_db
from app.legal import GRANT_FOUNDER_FREE, LEGAL_TERMS_VERSION
from app.mail import send_forgot_password_email, send_email, send_welcome_email
from app.models import User, UserSettings
from app.schemas import (
    AcceptTermsRequest,
    ChangePassword,
    DeleteAccount,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    UpdateName,
    UserPublic,
)
from app.services.categories import seed_default_categories

router = APIRouter(prefix="/api/auth", tags=["auth"])

_FORGOT_PASSWORD_MESSAGE = (
    "Si existe una cuenta con ese correo, te hemos enviado un enlace para elegir "
    "una contraseña nueva. Caduca en 1 hora. Revisa la bandeja de entrada y el spam."
)
_RESET_PASSWORD_OK = "Contraseña actualizada. Ya puedes entrar con la nueva."
_RESET_PASSWORD_INVALID = "El enlace no es válido o ha caducado."


def _require_current_terms(accepts_terms: bool, confirms_minimum_age: bool, terms_version: str) -> None:
    """El alta y la renovación exigen la versión vigente y la edad mínima."""
    if (
        accepts_terms
        and confirms_minimum_age
        and terms_version == LEGAL_TERMS_VERSION
    ):
        return
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=(
            "Debes aceptar las condiciones vigentes y confirmar que tienes al menos 14 años"
        ),
    )


def _stamp_terms(user: User) -> None:
    user.terms_version = LEGAL_TERMS_VERSION
    user.terms_accepted_at = datetime.now(timezone.utc)
    user.minimum_age_confirmed = True


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


def _notify_admin_new_user(email: str, name: str) -> None:
    """Avisa por correo de un alta, si ADMIN_NOTIFY_EMAIL está definido."""
    admin_email = (settings.admin_notify_email or "").strip()
    if not admin_email:
        return
    try:
        send_email(
            admin_email,
            "Nuevo registro en GastoDeHoy",
            f"Se ha registrado un nuevo usuario:\n\n"
            f"  Nombre: {name}\n"
            f"  Email: {email}\n"
            f"  Fecha: {datetime.now(timezone.utc):%d/%m/%Y %H:%M}\n",
        )
    except Exception as exc:
        _log.warning("admin notification failed for %s: %s", email, exc)


def _reset_link(token: str) -> str:
    base = settings.site_base_url()
    return f"{base}/reset-password?token={quote(token, safe='')}"


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


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
    check_login_rate(request, db, email)
    record_login_failure(request, db, email)
    _require_current_terms(
        payload.accepts_terms,
        payload.confirms_minimum_age,
        payload.terms_version,
    )

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
        terms_version=LEGAL_TERMS_VERSION,
        terms_accepted_at=now,
        minimum_age_confirmed=True,
        lifetime_free=GRANT_FOUNDER_FREE,
    )
    user.settings = UserSettings(language=payload.language)
    db.add(user)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        orig_msg = str(e.orig).lower() if e.orig else str(e).lower()
        if "users.email" in orig_msg or "ix_users_email" in orig_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe una cuenta con ese email",
            ) from e
        # Other UNIQUE violations (e.g., orphaned user_settings rows
        # occupying a reused user_id) should not happen after the
        # AUTOINCREMENT migration, but we log the real cause.
        _log.error(
            "register: IntegrityError inesperado para %s: %s",
            email,
            orig_msg,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al crear la cuenta. Inténtalo de nuevo.",
        ) from e
    db.refresh(user)
    seed_default_categories(db, user.id, lang=payload.language or "es")
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    set_session_cookie(response, make_session_token(user.id))

    # Send welcome email to the new user (non-blocking; failure is logged, not raised)
    try:
        send_welcome_email(email, payload.name)
    except Exception:
        _log.exception("Failed to send welcome email to %s", email)

    # Notify admin of new registration
    _notify_admin_new_user(email, payload.name)

    return RegisterResponse(user=UserPublic.model_validate(user))


@router.post("/accept-terms", response_model=UserPublic)
def accept_terms(
    payload: AcceptTermsRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserPublic:
    """Guarda la aceptación de la versión vigente en una cuenta ya creada."""
    _require_current_terms(
        payload.accepts_terms,
        payload.confirms_minimum_age,
        payload.terms_version,
    )
    _stamp_terms(user)
    db.commit()
    db.refresh(user)
    return UserPublic.model_validate(user)


def _login_password_ok(user: User | None, password: str) -> bool:
    """True only when the account exists and the password matches.

    A missing account, a too-short password or one bcrypt cannot store is a
    failure. The dummy hash keeps that path about as slow as a wrong password.
    """
    if (
        user is None
        or not (PASSWORD_MIN_LEN <= len(password) <= PASSWORD_MAX_LEN)
        or password_exceeds_bcrypt(password)
    ):
        verify_password_or_dummy(password, None)
        return False
    return verify_password(password, user.password_hash)


@router.post("/login", response_model=UserPublic)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> UserPublic:
    """Verify credentials, apply IP and email rate-limit, set the session cookie.

    A successful login does not insert a row and does not clear earlier failures.
    """
    email = _normalize_email(payload.email)
    check_login_rate(request, db, email)
    user = db.scalar(select(User).where(func.lower(User.email) == email))
    password_ok = _login_password_ok(user, payload.password)
    if not password_ok:
        record_login_failure(request, db, email)
        # The failure that fills the bucket is 429; the row stays stored.
        check_login_rate(request, db, email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )
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
    """Envía un enlace de un solo uso. No cambia la contraseña.

    Sin SMTP o sin URL pública responde 503. La misma respuesta 200 vale
    si el correo no existe. El dominio tiene que resolver antes de enviar.
    """
    email = _normalize_email(payload.email)
    check_login_rate(request, db, email)
    record_login_failure(request, db, email)
    if not (settings.smtp_host and settings.smtp_host.strip()):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "La recuperación por correo no está disponible: falta configuración SMTP "
                "en el servidor (SMTP_HOST, remitente, credenciales)."
            ),
        )
    if not settings.site_base_url():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "La recuperación por correo no está disponible: falta PUBLIC_BASE_URL "
                "o COOKIE_DOMAIN para construir el enlace."
            ),
        )

    if not _is_valid_email_format(email):
        _log.warning("forgot-password: formato invalido desde %s", _client_ip(request))
        return ForgotPasswordResponse(detail=_FORGOT_PASSWORD_MESSAGE)

    domain = email.split("@")[-1]
    if not _domain_has_mx(domain):
        _log.warning(
            "forgot-password: dominio sin MX '%s' desde %s",
            domain,
            _client_ip(request),
        )
        return ForgotPasswordResponse(detail=_FORGOT_PASSWORD_MESSAGE)

    user = db.scalar(select(User).where(func.lower(User.email) == email))
    # Mismo trabajo de token si el correo no existe, para no adelantar la respuesta.
    token = secrets.token_urlsafe(32)
    if user is None:
        hash_reset_token(token)
        return ForgotPasswordResponse(detail=_FORGOT_PASSWORD_MESSAGE)

    now = datetime.now(timezone.utc).replace(microsecond=0)
    user.password_reset_hash = hash_reset_token(token)
    user.password_reset_expires_at = now + RESET_TOKEN_TTL

    try:
        db.flush()
        send_forgot_password_email(email, _reset_link(token))
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se pudo enviar el correo. Inténtalo más tarde o contacta al administrador.",
        ) from exc

    return ForgotPasswordResponse(detail=_FORGOT_PASSWORD_MESSAGE)


@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> ResetPasswordResponse:
    """Cambia la contraseña con el enlace de un solo uso y lo invalida."""
    check_login_rate(request, db)
    token = payload.token.strip()
    digest = hash_reset_token(token)
    user = db.scalar(select(User).where(User.password_reset_hash == digest))
    email = user.email if user is not None else None
    if email is not None:
        check_login_rate(request, db, email)
    record_login_failure(request, db, email)
    if user is None or not user.password_reset_hash or not reset_tokens_match(
        token, user.password_reset_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_RESET_PASSWORD_INVALID,
        )
    expires = user.password_reset_expires_at
    if expires is None or _as_utc(expires) < datetime.now(timezone.utc):
        user.password_reset_hash = None
        user.password_reset_expires_at = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_RESET_PASSWORD_INVALID,
        )

    user.password_hash = hash_password(payload.new_password)
    user.password_changed_at = datetime.now(timezone.utc).replace(microsecond=0)
    user.password_reset_hash = None
    user.password_reset_expires_at = None
    user.must_change_password = False
    db.commit()
    return ResetPasswordResponse(detail=_RESET_PASSWORD_OK)


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

    Si venías de una contraseña temporal antigua, se emite una cookie nueva
    y sigues dentro. Si no, se cierra la sesión actual. Un enlace de
    recuperación pendiente queda invalidado.
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
    user.password_reset_hash = None
    user.password_reset_expires_at = None
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
