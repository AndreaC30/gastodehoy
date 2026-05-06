from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import SummaryRead
from app.services.budget import compute_summary
from app.datetime_util import today_in_app_timezone

router = APIRouter(prefix="/api", tags=["summary"])


@router.get("/summary", response_model=SummaryRead)
def read_summary(db: Session = Depends(get_db)) -> SummaryRead:
    data = compute_summary(db, today_in_app_timezone())
    return SummaryRead(**data)
