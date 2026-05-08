"""Endpoints for the per-user budget configuration (income + savings)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User, UserSettings
from app.schemas import BudgetSettings

router = APIRouter(prefix="/api", tags=["settings"])


def _get_or_create_settings(db: Session, user: User) -> UserSettings:
    """Return the user's settings row; lazily create defaults on first read."""
    if user.settings is None:
        row = UserSettings(user_id=user.id)
        db.add(row)
        db.commit()
        db.refresh(row)
        return row
    return user.settings


@router.get("/settings", response_model=BudgetSettings)
def read_settings(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> BudgetSettings:
    """Read the authenticated user's budget settings."""
    row = _get_or_create_settings(db, user)
    return BudgetSettings.model_validate(row)


@router.put("/settings", response_model=BudgetSettings)
def update_settings(
    payload: BudgetSettings,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> BudgetSettings:
    """Replace the user's budget settings (full upsert)."""
    row = _get_or_create_settings(db, user)
    row.monthly_income = payload.monthly_income
    row.savings_mode = payload.savings_mode
    row.savings_percent = payload.savings_percent
    row.savings_amount = payload.savings_amount
    db.commit()
    db.refresh(row)
    return BudgetSettings.model_validate(row)
