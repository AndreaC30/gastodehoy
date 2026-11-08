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
    ExtraIncome,
    FixedExpense,
    SavingsGoal,
    User,
    UserSettings,
    VariableExpense,
)
from app.services.budget import today_in_app_timezone

router = APIRouter(prefix="/api/export", tags=["export"])

_SAVINGS_MODE_LABEL = {
    "percent": "porcentaje",
    "fixed": "cantidad_fija",
}

# After leading whitespace is ignored, these still start a spreadsheet formula.
_FORMULA_TRIGGERS = frozenset("=+-@\t\r")


def _csv_text(value: str | None) -> str:
    """Prefix formula-like text so Excel and LibreOffice store it as text.

    Tab and carriage return are triggers, so they are not stripped before the check.
    """
    if not value:
        return ""
    i = 0
    while i < len(value) and value[i].isspace() and value[i] not in "\t\r":
        i += 1
    if value[i : i + 1] in _FORMULA_TRIGGERS:
        return "'" + value
    return value


@router.get("/csv")
def export_csv(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StreamingResponse:
    """Download the user's budget data as CSV."""
    ref = today_in_app_timezone()
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
            .where(VariableExpense.user_id == user.id)
            .order_by(VariableExpense.occurred_at.desc(), VariableExpense.id.desc())
        ).all()
    )

    categories = list(
        db.scalars(
            select(ExpenseCategory)
            .where(ExpenseCategory.user_id == user.id)
            .order_by(ExpenseCategory.id)
        ).all()
    )
    cat_names = {c.id: c.name for c in categories}

    extras = list(
        db.scalars(
            select(ExtraIncome)
            .where(ExtraIncome.user_id == user.id)
            .order_by(ExtraIncome.received_at.desc(), ExtraIncome.id.desc())
        ).all()
    )

    goals = list(
        db.scalars(
            select(SavingsGoal)
            .where(SavingsGoal.user_id == user.id)
            .order_by(SavingsGoal.id)
        ).all()
    )

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["seccion", "campo", "valor"])
    if settings:
        w.writerow(["ajustes", "ingreso_mensual", settings.monthly_income])
        w.writerow(
            [
                "ajustes",
                "modo_ahorro",
                _csv_text(
                    _SAVINGS_MODE_LABEL.get(settings.savings_mode, settings.savings_mode)
                ),
            ]
        )
        w.writerow(["ajustes", "porcentaje_ahorro", settings.savings_percent])
        w.writerow(["ajustes", "cantidad_ahorro", settings.savings_amount])
    w.writerow([])
    w.writerow(["gastos_fijos", "nombre", "importe"])
    for row in fixed:
        w.writerow(["gasto_fijo", _csv_text(row.name), row.amount])
    w.writerow([])
    w.writerow(["gastos_variables", "fecha", "importe", "categoria", "nota"])
    for row in variables:
        cat = cat_names.get(row.category_id) if row.category_id else ""
        w.writerow(
            [
                "gasto_variable",
                row.occurred_at.isoformat(),
                row.amount,
                _csv_text(cat),
                _csv_text(row.note),
            ]
        )
    w.writerow([])
    w.writerow(
        [
            "ingresos_extra",
            "fecha",
            "importe",
            "modo_ahorro",
            "porcentaje_ahorro",
            "cantidad_ahorro",
        ]
    )
    for row in extras:
        w.writerow(
            [
                "ingreso_extra",
                row.received_at.isoformat(),
                row.amount,
                _csv_text(row.savings_mode),
                row.savings_percent,
                row.savings_fixed,
            ]
        )
    w.writerow([])
    w.writerow(["metas_ahorro", "nombre", "objetivo", "ahorrado", "fecha"])
    for row in goals:
        w.writerow(
            [
                "meta_ahorro",
                _csv_text(row.name),
                row.target_amount,
                row.current_amount,
                row.target_date.isoformat() if row.target_date else "",
            ]
        )
    w.writerow([])
    w.writerow(
        ["categorias", "nombre", "presupuesto_mensual", "color", "icono"]
    )
    for row in categories:
        w.writerow(
            [
                "categoria",
                _csv_text(row.name),
                row.monthly_budget if row.monthly_budget is not None else "",
                _csv_text(row.color),
                _csv_text(row.icon),
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
