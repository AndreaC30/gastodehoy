from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.datetime_util import today_in_app_timezone
from app.models import User, VariableExpense
from app.schemas import VariableExpenseCreate, VariableExpenseRead
from app.services.budget import month_bounds

router = APIRouter(prefix="/api/expenses", tags=["expenses"])


@router.get("", response_model=list[VariableExpenseRead])
def list_expenses(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    year: int | None = Query(default=None, ge=2000, le=3000),
    month: int | None = Query(default=None, ge=1, le=12),
) -> list[VariableExpense]:
    ref = today_in_app_timezone()
    y = year if year is not None else ref.year
    m = month if month is not None else ref.month
    start, end = month_bounds(date(y, m, 1))
    stmt = (
        select(VariableExpense)
        .where(
            VariableExpense.user_id == user.id,
            VariableExpense.occurred_at >= start,
            VariableExpense.occurred_at <= end,
        )
        .order_by(VariableExpense.occurred_at.desc(), VariableExpense.id.desc())
    )
    return list(db.scalars(stmt).all())


@router.post("", response_model=VariableExpenseRead)
def create_expense(
    payload: VariableExpenseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> VariableExpense:
    day = payload.occurred_at or today_in_app_timezone()
    row = VariableExpense(
        user_id=user.id,
        amount=payload.amount,
        occurred_at=day,
        note=payload.note,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{expense_id}", status_code=204)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    row = db.get(VariableExpense, expense_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    db.delete(row)
    db.commit()
