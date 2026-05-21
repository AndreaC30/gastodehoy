"""Savings goals CRUD."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import SavingsGoal, User
from app.schemas import SavingsGoalCreate, SavingsGoalRead, SavingsGoalUpdate

router = APIRouter(prefix="/api/savings-goals", tags=["savings-goals"])


def _get_goal_or_404(db: Session, goal_id: int, user_id: int) -> SavingsGoal:
    row = db.get(SavingsGoal, goal_id)
    if row is None or row.user_id != user_id:
        raise HTTPException(status_code=404, detail="Meta no encontrada")
    return row


@router.get("", response_model=list[SavingsGoalRead])
def list_goals(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[SavingsGoal]:
    stmt = (
        select(SavingsGoal)
        .where(SavingsGoal.user_id == user.id)
        .order_by(SavingsGoal.id)
    )
    return list(db.scalars(stmt).all())


@router.post("", response_model=SavingsGoalRead, status_code=201)
def create_goal(
    payload: SavingsGoalCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SavingsGoal:
    row = SavingsGoal(
        user_id=user.id,
        name=payload.name,
        target_amount=payload.target_amount,
        current_amount=payload.current_amount,
        target_date=payload.target_date,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/{goal_id}", response_model=SavingsGoalRead)
def update_goal(
    goal_id: int,
    payload: SavingsGoalUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SavingsGoal:
    row = _get_goal_or_404(db, goal_id, user.id)
    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates:
        row.name = updates["name"]
    if "target_amount" in updates:
        row.target_amount = updates["target_amount"]
    if "current_amount" in updates:
        row.current_amount = updates["current_amount"]
    if "target_date" in updates:
        row.target_date = updates["target_date"]
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{goal_id}", status_code=204)
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    row = _get_goal_or_404(db, goal_id, user.id)
    db.delete(row)
    db.commit()
