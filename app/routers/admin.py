"""Minimal admin endpoints: stats + notification bridge for n8n.

KISS: no auth, solo datos agregados y un puente para que n8n
pueda enviar correos usando el SMTP ya configurado en GastoDeHoy.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.mail import send_email
from app.models import User, VariableExpense, FixedExpense, UserSettings

_log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])


class StatsResponse(BaseModel):
    total_users: int
    new_users_24h: int
    new_users_7d: int
    active_users_7d: int
    active_users_30d: int


@router.get("/stats", response_model=StatsResponse)
def stats(db: Session = Depends(get_db)) -> StatsResponse:
    """Return aggregate user statistics."""
    now = datetime.now(timezone.utc)

    total = db.scalar(select(func.count(User.id))) or 0
    new_24h = (
        db.scalar(
            select(func.count(User.id)).where(
                User.created_at >= now - timedelta(hours=24)
            )
        )
        or 0
    )
    new_7d = (
        db.scalar(
            select(func.count(User.id)).where(
                User.created_at >= now - timedelta(days=7)
            )
        )
        or 0
    )
    active_7d = (
        db.scalar(
            select(func.count(User.id)).where(
                User.last_login_at >= now - timedelta(days=7)
            )
        )
        or 0
    )
    active_30d = (
        db.scalar(
            select(func.count(User.id)).where(
                User.last_login_at >= now - timedelta(days=30)
            )
        )
        or 0
    )

    return StatsResponse(
        total_users=total,
        new_users_24h=new_24h,
        new_users_7d=new_7d,
        active_users_7d=active_7d,
        active_users_30d=active_30d,
    )


class AnalyticsResponse(BaseModel):
    total_users: int
    users_with_expenses: int
    users_with_income_set: int
    users_tour_completed: int
    total_variable_expenses: int
    total_fixed_expenses: int
    active_users_7d: int
    active_users_30d: int
    # Desglose por usuario (últimos 30 días)
    user_activity: list[dict]


@router.get("/analytics", response_model=AnalyticsResponse)
def analytics(db: Session = Depends(get_db)) -> AnalyticsResponse:
    """Return detailed usage analytics for n8n reporting."""
    now = datetime.now(timezone.utc)

    total_users = db.scalar(select(func.count(User.id))) or 0

    active_7d = (
        db.scalar(
            select(func.count(User.id)).where(
                User.last_login_at >= now - timedelta(days=7)
            )
        )
        or 0
    )
    active_30d = (
        db.scalar(
            select(func.count(User.id)).where(
                User.last_login_at >= now - timedelta(days=30)
            )
        )
        or 0
    )

    users_with_expenses = db.scalar(
        select(func.count(func.distinct(VariableExpense.user_id)))
    ) or 0

    users_with_income = (
        db.scalar(
            select(func.count(UserSettings.id)).where(
                UserSettings.monthly_income > 0
            )
        )
        or 0
    )

    users_tour_done = (
        db.scalar(
            select(func.count(UserSettings.id)).where(
                UserSettings.dashboard_tour_completed == True  # noqa: E712
            )
        )
        or 0
    )

    total_variable = db.scalar(
        select(func.count(VariableExpense.id))
    ) or 0

    total_fixed = db.scalar(
        select(func.count(FixedExpense.id))
    ) or 0

    # Actividad por usuario (últimos 30 días) — LEFT JOIN para incluir
    # usuarios sin gastos recientes
    from sqlalchemy import and_

    cutoff = now.date() - timedelta(days=30)
    rows = (
        db.execute(
            select(
                User.email,
                func.count(VariableExpense.id).label("gastos"),
                func.count(func.distinct(VariableExpense.occurred_at)).label("dias"),
            )
            .outerjoin(
                VariableExpense,
                and_(
                    VariableExpense.user_id == User.id,
                    VariableExpense.occurred_at >= cutoff,
                ),
            )
            .group_by(User.id)
            .order_by(func.count(func.distinct(VariableExpense.occurred_at)).desc())
        )
        .mappings()
        .all()
    )

    user_activity = [
        {
            "email": row["email"],
            "gastos": row["gastos"],
            "dias_distintos": row["dias"],
        }
        for row in rows
    ]

    return AnalyticsResponse(
        total_users=total_users,
        users_with_expenses=users_with_expenses,
        users_with_income_set=users_with_income,
        users_tour_completed=users_tour_done,
        total_variable_expenses=total_variable,
        total_fixed_expenses=total_fixed,
        active_users_7d=active_7d,
        active_users_30d=active_30d,
        user_activity=user_activity,
    )


class NotificationRequest(BaseModel):
    subject: str
    body: str


@router.post("/send-notification", status_code=204)
def send_notification(payload: NotificationRequest):
    """Bridge para que n8n envíe correos usando el SMTP de GastoDeHoy.

    Envía un email a gastodehoy@gmail.com (el admin). Úsalo desde n8n
    con un nodo HTTP Request apuntando a este endpoint.
    """
    admin_email = "gastodehoy@gmail.com"
    try:
        send_email(admin_email, payload.subject, payload.body)
        _log.info("admin notification sent: %s", payload.subject)
    except Exception as exc:
        _log.error("admin notification failed: %s", exc)
        raise
