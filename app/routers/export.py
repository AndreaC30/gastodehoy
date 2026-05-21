"""Data export (CSV)."""

import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import (
    ExpenseCategory,
    FixedExpense,
    User,
    UserSettings,
    VariableExpense,
)
from app.services.budget import month_bounds, today_in_app_timezone

router = APIRouter(prefix="/api/export", tags=["export"])

_SAVINGS_MODE_LABEL = {
    "percent": "porcentaje",
    "fixed": "cantidad_fija",
}


@router.get("/csv")
def export_csv(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StreamingResponse:
    """Download user budget data as CSV (settings, fixed, variable this month)."""
    ref = today_in_app_timezone()
    start, end = month_bounds(ref)
    filename = f"gastodehoy-{ref.isoformat()}.csv"

    settings = db.scalar(
        select(UserSettings).where(UserSettings.user_id == user.id)
    )

    fixed = list(
        db.scalars(
            select(FixedExpense)
            .where(FixedExpense.user_id == user.id)
            .order_by(FixedExpense.id)
        ).all()
    )

    variables = list(
        db.scalars(
            select(VariableExpense)
            .where(
                VariableExpense.user_id == user.id,
                VariableExpense.occurred_at >= start,
                VariableExpense.occurred_at <= end,
            )
            .order_by(VariableExpense.occurred_at.desc(), VariableExpense.id.desc())
        ).all()
    )

    cat_names: dict[int, str] = {}
    for c in db.scalars(
        select(ExpenseCategory).where(ExpenseCategory.user_id == user.id)
    ).all():
        cat_names[c.id] = c.name

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["seccion", "campo", "valor"])
    if settings:
        w.writerow(["ajustes", "ingreso_mensual", settings.monthly_income])
        w.writerow(
            [
                "ajustes",
                "modo_ahorro",
                _SAVINGS_MODE_LABEL.get(settings.savings_mode, settings.savings_mode),
            ]
        )
        w.writerow(["ajustes", "porcentaje_ahorro", settings.savings_percent])
        w.writerow(["ajustes", "cantidad_ahorro", settings.savings_amount])
    w.writerow([])
    w.writerow(["gastos_fijos", "nombre", "importe"])
    for row in fixed:
        w.writerow(["gasto_fijo", row.name, row.amount])
    w.writerow([])
    w.writerow(["gastos_variables", "fecha", "importe", "categoria", "nota"])
    for row in variables:
        cat = cat_names.get(row.category_id) if row.category_id else ""
        w.writerow(
            [
                "gasto_variable",
                row.occurred_at.isoformat(),
                row.amount,
                cat or "",
                row.note or "",
            ]
        )

    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
