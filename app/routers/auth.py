"""HTTP endpoints for authentication.

Register / login / logout use ``HttpOnly`` signed cookies. ``recover``
swaps a password using the one-shot recovery code generated at register.
A change of password (or a recovery) clears the cookie and forces re-login.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import (
    check_login_rate,
    clear_session_cookie,
    generate_recovery_code,
    get_current_user,
    hash_password,
    hash_recovery_code,
    make_session_token,
    reset_login_rate,
    set_session_cookie,
    verify_password,
    verify_recovery_code,
)
from app.database import get_db
from app.models import User, UserSettings
from app.schemas import (
    ChangePassword,
    DeleteAccount,
    LoginRequest,
    RecoverRequest,
    RecoverResponse,
    RegisterRequest,
    RegisterResponse,
    UpdateName,
    UserPublic,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _normalize_email(email: str) -> str:
    """Lowercase + trim so logins are case-insensitive."""
    return email.strip().lower()


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    payload: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> RegisterResponse:
    """Create an account, set the session cookie, and return the
    one-time recovery code (it is shown to the user only once)."""
    email = _normalize_email(payload.email)
    now = datetime.now(timezone.utc).replace(microsecond=0)
    recovery_code = generate_recovery_code()
    user = User(
        email=email,
        name=payload.name,
        password_hash=hash_password(payload.password),
        password_changed_at=now,
        recovery_hash=hash_recovery_code(recovery_code),
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
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    set_session_cookie(response, make_session_token(user.id))
    return RegisterResponse(
        user=UserPublic.model_validate(user),
        recovery_code=recovery_code,
    )


@router.post("/login", response_model=UserPublic)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> User:
    """Verify credentials, apply IP rate-limit and set the session cookie."""
    check_login_rate(request)
    email = _normalize_email(payload.email)
    user = db.scalar(select(User).where(func.lower(User.email) == email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )
    reset_login_rate(request)
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    set_session_cookie(response, make_session_token(user.id))
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    """Clear the session cookie. Idempotent."""
    clear_session_cookie(response)


@router.post("/recover", response_model=RecoverResponse)
def recover(
    payload: RecoverRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> RecoverResponse:
    """Reset the password using the one-shot recovery code.

    The code is invalidated on use and a fresh one is returned. No session
    is opened: the user must log in again with the new password.
    """
    check_login_rate(request)
    email = _normalize_email(payload.email)
    user = db.scalar(select(User).where(func.lower(User.email) == email))
    if user is None or not verify_recovery_code(
        payload.recovery_code, user.recovery_hash
    ):
        # Mensaje genérico para no filtrar si el email existe.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o código de recuperación incorrectos",
        )
    reset_login_rate(request)

    new_code = generate_recovery_code()
    user.password_hash = hash_password(payload.new_password)
    user.password_changed_at = datetime.now(timezone.utc)
    user.recovery_hash = hash_recovery_code(new_code)
    db.commit()
    # Invalida cualquier sesión previa: el usuario debe hacer login.
    clear_session_cookie(response)
    return RecoverResponse(recovery_code=new_code)


@router.get("/me", response_model=UserPublic)
def me(user: User = Depends(get_current_user)) -> User:
    """Return the currently-authenticated user (or 401)."""
    return user


@router.patch("/me", response_model=UserPublic)
def update_me(
    payload: UpdateName,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> User:
    """Rename the authenticated user."""
    user.name = payload.name
    db.commit()
    db.refresh(user)
    return user


@router.put("/me/password", response_model=UserPublic)
def change_password(
    payload: ChangePassword,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> User:
    """Change the password and clear ALL sessions (forces re-login)."""
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña actual incorrecta",
        )
    user.password_hash = hash_password(payload.new_password)
    # Microsegundos sí: garantiza que el `issued_at` de cualquier cookie
    # previa (segundo-precisión) sea estrictamente menor que este timestamp,
    # incluso si todo ocurre en el mismo segundo de reloj.
    user.password_changed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    # Tras cambiar la clave invalidamos TODAS las sesiones, incluida ésta.
    # El usuario hace login otra vez con la nueva contraseña.
    clear_session_cookie(response)
    return user


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
