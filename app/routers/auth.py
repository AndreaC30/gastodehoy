"""Auth con cookie HttpOnly + bcrypt + rate limit en login."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import (
    check_login_rate,
    clear_session_cookie,
    get_current_user,
    hash_password,
    make_session_token,
    reset_login_rate,
    set_session_cookie,
    verify_password,
)
from app.database import get_db
from app.models import User, UserSettings
from app.schemas import (
    ChangePassword,
    DeleteAccount,
    LoginRequest,
    RegisterRequest,
    UpdateName,
    UserPublic,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _normalize_email(email: str) -> str:
    return email.strip().lower()


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> User:
    email = _normalize_email(payload.email)
    user = User(
        email=email,
        name=payload.name,
        password_hash=hash_password(payload.password),
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
    return user


@router.post("/login", response_model=UserPublic)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> User:
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
    clear_session_cookie(response)


@router.get("/me", response_model=UserPublic)
def me(user: User = Depends(get_current_user)) -> User:
    return user


@router.patch("/me", response_model=UserPublic)
def update_me(
    payload: UpdateName,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> User:
    user.name = payload.name
    db.commit()
    db.refresh(user)
    return user


@router.put("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePassword,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña actual incorrecta",
        )
    user.password_hash = hash_password(payload.new_password)
    db.commit()


@router.post("/me/delete", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(
    payload: DeleteAccount,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña incorrecta",
        )
    db.delete(user)
    db.commit()
    clear_session_cookie(response)
