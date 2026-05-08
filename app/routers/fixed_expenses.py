"""CRUD endpoints for the user's recurring monthly expenses."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import FixedExpense, User
from app.schemas import FixedExpenseCreate, FixedExpenseRead, FixedExpenseUpdate

router = APIRouter(prefix="/api/fixed-expenses", tags=["fixed-expenses"])


@router.get("", response_model=list[FixedExpenseRead])
def list_fixed(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[FixedExpense]:
    """List the authenticated user's fixed expenses."""
    stmt = (
        select(FixedExpense)
        .where(FixedExpense.user_id == user.id)
        .order_by(FixedExpense.id)
    )
    return list(db.scalars(stmt).all())


@router.post("", response_model=FixedExpenseRead)
def create_fixed(
    payload: FixedExpenseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FixedExpense:
    """Add a new fixed expense for the authenticated user."""
    row = FixedExpense(user_id=user.id, name=payload.name, amount=payload.amount)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/{expense_id}", response_model=FixedExpenseRead)
def update_fixed(
    expense_id: int,
    payload: FixedExpenseUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FixedExpense:
    """Patch ``name`` and/or ``amount``; 404 if the row belongs to another user."""
    row = db.get(FixedExpense, expense_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Gasto fijo no encontrado")
    if payload.name is None and payload.amount is None:
        raise HTTPException(status_code=400, detail="Nada que actualizar")
    if payload.name is not None:
        row.name = payload.name
    if payload.amount is not None:
        row.amount = payload.amount
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{expense_id}", status_code=204)
def delete_fixed(
    expense_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    """Delete a fixed expense; 404 if it belongs to another user."""
    row = db.get(FixedExpense, expense_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Gasto fijo no encontrado")
    db.delete(row)
    db.commit()
