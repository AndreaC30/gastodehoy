"""Endpoint that returns the per-user budget summary for the current day."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.datetime_util import today_in_app_timezone
from app.models import User
from app.schemas import SummaryRead
from app.services.budget import compute_summary

router = APIRouter(prefix="/api", tags=["summary"])


@router.get("/summary", response_model=SummaryRead)
def read_summary(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SummaryRead:
    """Return today's budget snapshot for the authenticated user."""
    data = compute_summary(db, user.id, today_in_app_timezone())
    return SummaryRead(**data)
