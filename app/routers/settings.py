from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import UserSettings
from app.schemas import BudgetSettings

router = APIRouter(prefix="/api", tags=["settings"])


@router.get("/settings", response_model=BudgetSettings)
def read_settings(db: Session = Depends(get_db)) -> BudgetSettings:
    row = db.get(UserSettings, 1)
    if row is None:
        row = UserSettings(id=1)
        db.add(row)
        db.commit()
        db.refresh(row)
    return BudgetSettings.model_validate(row)


@router.put("/settings", response_model=BudgetSettings)
def update_settings(payload: BudgetSettings, db: Session = Depends(get_db)) -> BudgetSettings:
    row = db.get(UserSettings, 1)
    if row is None:
        row = UserSettings(id=1)
        db.add(row)
    row.monthly_income = payload.monthly_income
    row.savings_percent = payload.savings_percent
    db.commit()
    db.refresh(row)
    return BudgetSettings.model_validate(row)
