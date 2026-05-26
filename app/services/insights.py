"""Spending analysis and insight generation."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Literal

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.models import ExpenseCategory, UserSettings, VariableExpense
from app.services.budget import (
    compute_summary,
    days_remaining_in_month,
    month_bounds,
    today_in_app_timezone,
)

# ── Insight type constants (used by notification_message.py) ─────────────────
INSIGHT_TYPE_WARNING: str = "warning"
INSIGHT_TYPE_SUCCESS: str = "success"
INSIGHT_TYPE_INFO: str = "info"
INSIGHT_TYPE_TIP: str = "tip"

# ── Insight title constants (used by notification_message.py for matching) ──
TITLE_MORE_SPENDING: str = "Más gasto que el mes pasado"
TITLE_LESS_SPENDING: str = "Menos gasto que el mes pasado"
TITLE_SIMILAR_PACE: str = "Ritmo similar al mes pasado"
TITLE_CONCENTRATED_SPENDING: str = "Gasto concentrado"
TITLE_HIGH_SPENDING_RATIO: str = "Gastas casi todo tu ingreso"
TITLE_GOOD_PACE: str = "¡Buen ritmo de gasto!"
TITLE_PROJECTED_OVERSPEND: str = "Proyección de sobregasto"
TITLE_CATEGORIZE_EXPENSES: str = "Categoriza tus gastos"
TITLE_HIGH_FIXED_COSTS: str = "Gastos fijos altos"
TITLE_DAILY_LIMIT: str = "Tope diario recomendado"
TITLE_BUDGET_EXHAUSTED: str = "Presupuesto agotado"
TITLE_KEEP_RECORDING: str = "Sigue registrando"


def _previous_month_bounds(month_start: date) -> tuple[date, date]:
    """First and last day of the calendar month before ``month_start``."""
    if month_start.month == 1:
        ref = date(month_start.year - 1, 12, 1)
    else:
        ref = date(month_start.year, month_start.month - 1, 1)
    return month_bounds(ref)


def _safe_pct(part: Decimal, whole: Decimal) -> Decimal:
    """Return percentage (0-100) with two decimals, avoiding division by zero."""
    if whole == 0:
        return Decimal("0")
    return (part / whole * 100).quantize(Decimal("0.01"))


def compute_insights(
    session: Session,
    user_id: int,
    month_start: date,
    month_end: date,
    summary: dict | None = None,
) -> dict:
    """Analyse variable expenses for the period and return structured insights."""

    # --- Category breakdown ---------------------------------------------------
    # Aggregate spending by category (including uncategorised)
    cat_rows = session.execute(
        select(
            ExpenseCategory.id,
            ExpenseCategory.name,
            ExpenseCategory.color,
            ExpenseCategory.icon,
            ExpenseCategory.monthly_budget,
            func.coalesce(func.sum(VariableExpense.amount), Decimal("0")),
            func.count(VariableExpense.id),
        )
        .select_from(VariableExpense)
        .outerjoin(
            ExpenseCategory,
            and_(
                VariableExpense.category_id == ExpenseCategory.id,
                ExpenseCategory.user_id == user_id,
            ),
        )
        .where(
            VariableExpense.user_id == user_id,
            VariableExpense.occurred_at >= month_start,
            VariableExpense.occurred_at <= month_end,
        )
        .group_by(
            ExpenseCategory.id,
            ExpenseCategory.name,
            ExpenseCategory.color,
            ExpenseCategory.icon,
            ExpenseCategory.monthly_budget,
        )
        .order_by(func.sum(VariableExpense.amount).desc())
    ).all()

    total_spent = sum(row[5] for row in cat_rows)
    total_spent = Decimal(total_spent).quantize(Decimal("0.01"))

    breakdown: list[dict] = []
    for row in cat_rows:
        cat_id, cat_name, cat_color, cat_icon, cat_budget, cat_total, cat_count = row
        cat_total = Decimal(cat_total).quantize(Decimal("0.01"))
        budget: Decimal | None = None
        if cat_budget is not None:
            budget = Decimal(cat_budget).quantize(Decimal("0.01"))
        over_budget = budget is not None and cat_total > budget
        budget_used = _safe_pct(cat_total, budget) if budget and budget > 0 else None
        breakdown.append(
            {
                "category_id": cat_id,
                "category_name": cat_name or "Sin categoría",
                "category_color": cat_color or "#64748b",
                "category_icon": cat_icon,
                "total": cat_total,
                "percentage": _safe_pct(cat_total, total_spent),
                "transaction_count": cat_count,
                "monthly_budget": budget,
                "over_budget": over_budget,
                "budget_used_percent": budget_used,
            }
        )

    top_category = breakdown[0] if breakdown and breakdown[0]["total"] > 0 else None

    # --- Daily average & projection ------------------------------------------
    days_elapsed = (month_end - month_start).days + 1
    today = today_in_app_timezone()
    if today > month_end:
        elapsed = days_elapsed
    elif today < month_start:
        elapsed = 0
    else:
        elapsed = (today - month_start).days + 1

    elapsed = max(elapsed, 1)
    avg_daily = (total_spent / elapsed).quantize(Decimal("0.01"))
    projected = (avg_daily * days_elapsed).quantize(Decimal("0.01"))

    # --- Generate insights ----------------------------------------------------
    insights: list[dict] = []

    us = session.scalar(
        select(UserSettings).where(UserSettings.user_id == user_id)
    )
    monthly_income = us.monthly_income if us else Decimal("0")

    # 0. Month-over-month variable spending
    prev_start, prev_end = _previous_month_bounds(month_start)
    prev_spent = session.scalar(
        select(func.coalesce(func.sum(VariableExpense.amount), 0)).where(
            VariableExpense.user_id == user_id,
            VariableExpense.occurred_at >= prev_start,
            VariableExpense.occurred_at <= prev_end,
        )
    ) or Decimal("0")
    prev_spent = Decimal(prev_spent).quantize(Decimal("0.01"))
    if prev_spent > 0:
        diff = total_spent - prev_spent
        pct_change = _safe_pct(abs(diff), prev_spent)
        if diff > Decimal("0.01"):
            insights.append(
                {
                    "type": INSIGHT_TYPE_WARNING,
                    "title": TITLE_MORE_SPENDING,
                    "message": (
                        f"Este mes llevas {total_spent}€ en gastos variables, "
                        f"{pct_change}% más que los {prev_spent}€ del mes anterior."
                    ),
                    "icon": "trending_up",
                }
            )
        elif diff < Decimal("-0.01"):
            insights.append(
                {
                    "type": INSIGHT_TYPE_SUCCESS,
                    "title": TITLE_LESS_SPENDING,
                    "message": (
                        f"Este mes llevas {total_spent}€ en gastos variables, "
                        f"{pct_change}% menos que los {prev_spent}€ del mes anterior."
                    ),
                    "icon": "trending_down",
                }
            )
        else:
            insights.append(
                {
                    "type": INSIGHT_TYPE_INFO,
                    "title": TITLE_SIMILAR_PACE,
                    "message": (
                        f"Tus gastos variables ({total_spent}€) van parecidos "
                        f"al mes anterior ({prev_spent}€)."
                    ),
                    "icon": "calendar",
                }
            )

    # 1. Top category concentration
    if top_category and top_category["percentage"] > 50:
        insights.append(
            {
                "type": INSIGHT_TYPE_WARNING,
                "title": TITLE_CONCENTRATED_SPENDING,
                "message": (
                    f"El {top_category['percentage']}% de tu gasto este mes fue en "
                    f"{top_category['category_name']}. Considera si puedes reducirlo."
                ),
                "icon": "alert_triangle",
            }
        )

    # 2. Income vs spending ratio
    if monthly_income > 0:
        spend_pct = _safe_pct(total_spent, monthly_income)
        if spend_pct > 80:
            insights.append(
                {
                    "type": INSIGHT_TYPE_WARNING,
                    "title": TITLE_HIGH_SPENDING_RATIO,
                    "message": (
                        f"Llevas gastado el {spend_pct}% de tu ingreso mensual. "
                        f"Intenta dejar al menos un 20% para ahorro."
                    ),
                    "icon": "alert_circle",
                }
            )
        elif spend_pct < 40 and elapsed > 15:
            insights.append(
                {
                    "type": INSIGHT_TYPE_SUCCESS,
                    "title": TITLE_GOOD_PACE,
                    "message": (
                        f"Solo has gastado el {spend_pct}% de tu ingreso. "
                        f"Sigue así y tendrás buen margen para ahorrar."
                    ),
                    "icon": "check_circle",
                }
            )

    # 3. Projection warning
    if monthly_income > 0 and projected > monthly_income:
        over = projected - monthly_income
        insights.append(
            {
                "type": INSIGHT_TYPE_WARNING,
                "title": TITLE_PROJECTED_OVERSPEND,
                "message": (
                    f"A este ritmo, gastarás ~{projected}€ este mes "
                    f"({over}€ más que tu ingreso). Ajusta tu ritmo."
                ),
                "icon": "trending_up",
            }
        )

    # 4. Category monthly budget exceeded
    for item in breakdown:
        if not item.get("over_budget"):
            continue
        budget = item["monthly_budget"]
        insights.append(
            {
                "type": INSIGHT_TYPE_WARNING,
                "title": f"Presupuesto superado: {item['category_name']}",
                "message": (
                    f"Has gastado {item['total']}€ de {budget}€ presupuestados "
                    f"en {item['category_name']} este mes. Ajusta el ritmo o revisa el límite."
                ),
                "icon": "alert_triangle",
            }
        )

    # 5. Uncategorised expenses
    uncategorised = next(
        (b for b in breakdown if b["category_id"] is None), None
    )
    if uncategorised and uncategorised["transaction_count"] > 0:
        insights.append(
            {
                "type": INSIGHT_TYPE_TIP,
                "title": TITLE_CATEGORIZE_EXPENSES,
                "message": (
                    f"Tienes {uncategorised['transaction_count']} gasto(s) sin categoría. "
                    f"Asignar categorías te ayuda a entender mejor en qué gastas."
                ),
                "icon": "tags",
            }
        )

    days_left = days_remaining_in_month(today)
    needs_budget_snapshot = monthly_income > 0 and (
        us is not None or (avg_daily > 0 and days_left > 0)
    )
    if summary is None and needs_budget_snapshot:
        summary = compute_summary(session, user_id, today)

    # 6. Fixed expenses ratio
    if us and monthly_income > 0 and summary is not None:
        fixed_total = summary["fixed_expenses_total"]
        fixed_pct = _safe_pct(fixed_total, monthly_income)
        if fixed_pct > 60:
            insights.append(
                {
                    "type": INSIGHT_TYPE_INFO,
                    "title": TITLE_HIGH_FIXED_COSTS,
                    "message": (
                        f"Tus gastos fijos representan el {fixed_pct}% de tu ingreso. "
                        f"Lo recomendable es mantenerlos bajo el 50%."
                    ),
                    "icon": "home",
                }
            )

    # 7. Daily spending tip (aligned with dashboard «Hoy puedes gastar»)
    if avg_daily > 0 and days_left > 0 and monthly_income > 0 and summary is not None:
        remaining = summary["remaining_this_month"]
        daily_budget = summary["suggested_spend_today"]

        if daily_budget > 0:
            insights.append(
                {
                    "type": INSIGHT_TYPE_INFO,
                    "title": TITLE_DAILY_LIMIT,
                    "message": (
                        f"Te quedan {remaining}€ repartidos en {days_left} días "
                        f"(hasta {daily_budget}€/día, igual que «Hoy puedes gastar»)."
                    ),
                    "icon": "calendar",
                }
            )
        else:
            insights.append(
                {
                    "type": INSIGHT_TYPE_WARNING,
                    "title": TITLE_BUDGET_EXHAUSTED,
                    "message": (
                        f"Has superado tu presupuesto mensual. "
                        f"Te quedan {remaining}€ para {days_left} días."
                    ),
                    "icon": "alert_circle",
                }
            )

    # Fallback if no insights generated
    if not insights:
        insights.append(
            {
                "type": INSIGHT_TYPE_INFO,
                "title": TITLE_KEEP_RECORDING,
                "message": (
                    "Registra más gastos para recibir insights personalizados "
                    "sobre tus hábitos de consumo."
                ),
                "icon": "lightbulb",
            }
        )

    return {
        "period_start": month_start,
        "period_end": month_end,
        "total_spent": total_spent,
        "top_category": top_category,
        "category_breakdown": breakdown,
        "insights": insights,
        "avg_daily_spend": avg_daily,
        "projected_monthly": projected,
    }
