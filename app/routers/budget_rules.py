"""Budget rule endpoints (50/30/20)."""

from datetime import date

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.schemas import Rule503020Read
from app.services.budget import month_bounds, today_in_app_timezone
from app.services.rule_503020 import compute_rule_503020

router = APIRouter(prefix="/api", tags=["budget-rules"])


def _month_reference(year: int | None, month: int | None) -> date:
    ref = today_in_app_timezone()
    y = year if year is not None else ref.year
    m = month if month is not None else ref.month
    return month_bounds(date(y, m, 1))[0]


@router.get("/rule-503020", response_model=Rule503020Read)
def read_rule_503020(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    year: int | None = Query(default=None, ge=2000, le=3000),
    month: int | None = Query(default=None, ge=1, le=12),
    lang: str | None = Query(default=None),
) -> Rule503020Read:
    """Return the authenticated user's 50/30/20 breakdown for a calendar month."""
    # Determine language: query param > Accept-Language header > default es
    language = "es"
    if lang and lang in ("en", "es", "fr", "de"):
        language = lang
    elif request.headers.get("accept-language"):
        al = request.headers["accept-language"].split(",")[0].split(";")[0].strip()
        if al.startswith("en"):
            language = "en"
        elif al.startswith("fr"):
            language = "fr"
        elif al.startswith("de"):
            language = "de"
    ref = _month_reference(year, month)
    data = compute_rule_503020(db, user.id, ref, lang=language)
    return Rule503020Read(**data)
