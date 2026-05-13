"""Spending analysis and insight generation."""

from datetime import date, timedelta
from decimal import Decimal
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import ExpenseCategory, UserSettings, VariableExpense


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
) -> dict:
    """Analyse variable expenses for the period and return structured insights."""

    # --- Category breakdown ---------------------------------------------------
    # Aggregate spending by category (including uncategorised)
    cat_rows = session.execute(
        select(
            ExpenseCategory.id,
            ExpenseCategory.name,
            ExpenseCategory.color,
            func.coalesce(func.sum(VariableExpense.amount), Decimal("0")),
            func.count(VariableExpense.id),
        )
        .select_from(VariableExpense)
        .outerjoin(
            ExpenseCategory,
            VariableExpense.category_id == ExpenseCategory.id,
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
        )
        .order_by(func.sum(VariableExpense.amount).desc())
    ).all()

    total_spent = sum(row[3] for row in cat_rows)
    total_spent = Decimal(total_spent).quantize(Decimal("0.01"))

    breakdown: list[dict] = []
    for row in cat_rows:
        cat_id, cat_name, cat_color, cat_total, cat_count = row
        cat_total = Decimal(cat_total).quantize(Decimal("0.01"))
        breakdown.append(
            {
                "category_id": cat_id,
                "category_name": cat_name or "Sin categoría",
                "category_color": cat_color or "#64748b",
                "total": cat_total,
                "percentage": _safe_pct(cat_total, total_spent),
                "transaction_count": cat_count,
            }
        )

    top_category = breakdown[0] if breakdown and breakdown[0]["total"] > 0 else None

    # --- Daily average & projection ------------------------------------------
    days_elapsed = (month_end - month_start).days + 1
    today = date.today()
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

    # 1. Top category concentration
    if top_category and top_category["percentage"] > 50:
        insights.append(
            {
                "type": "warning",
                "title": "Gasto concentrado",
                "message": (
                    f"El {top_category['percentage']}% de tu gasto este mes fue en "
                    f"{top_category['category_name']}. Considera si puedes reducirlo."
                ),
                "icon": "⚠️",
            }
        )

    # 2. Income vs spending ratio
    if monthly_income > 0:
        spend_pct = _safe_pct(total_spent, monthly_income)
        if spend_pct > 80:
            insights.append(
                {
                    "type": "warning",
                    "title": "Gastas casi todo tu ingreso",
                    "message": (
                        f"Llevas gastado el {spend_pct}% de tu ingreso mensual. "
                        f"Intenta dejar al menos un 20% para ahorro."
                    ),
                    "icon": "🚨",
                }
            )
        elif spend_pct < 40 and elapsed > 15:
            insights.append(
                {
                    "type": "success",
                    "title": "¡Buen ritmo de gasto!",
                    "message": (
                        f"Solo has gastado el {spend_pct}% de tu ingreso. "
                        f"Sigue así y tendrás buen margen para ahorrar."
                    ),
                    "icon": "✅",
                }
            )

    # 3. Projection warning
    if monthly_income > 0 and projected > monthly_income:
        over = projected - monthly_income
        insights.append(
            {
                "type": "warning",
                "title": "Proyección de sobregasto",
                "message": (
                    f"A este ritmo, gastarás ~{projected}€ este mes "
                    f"({over}€ más que tu ingreso). Ajusta tu ritmo."
                ),
                "icon": "📈",
            }
        )

    # 4. Uncategorised expenses
    uncategorised = next(
        (b for b in breakdown if b["category_id"] is None), None
    )
    if uncategorised and uncategorised["transaction_count"] > 0:
        insights.append(
            {
                "type": "tip",
                "title": "Categoriza tus gastos",
                "message": (
                    f"Tienes {uncategorised['transaction_count']} gasto(s) sin categoría. "
                    f"Asignar categorías te ayuda a entender mejor en qué gastas."
                ),
                "icon": "🏷️",
            }
        )

    # 5. Fixed expenses ratio
    if us and monthly_income > 0:
        from app.models import FixedExpense

        fixed_total = session.scalar(
            select(func.coalesce(func.sum(FixedExpense.amount), 0)).where(
                FixedExpense.user_id == user_id
            )
        ) or Decimal("0")
        fixed_total = Decimal(fixed_total).quantize(Decimal("0.01"))
        fixed_pct = _safe_pct(fixed_total, monthly_income)
        if fixed_pct > 60:
            insights.append(
                {
                    "type": "info",
                    "title": "Gastos fijos altos",
                    "message": (
                        f"Tus gastos fijos representan el {fixed_pct}% de tu ingreso. "
                        f"Lo recomendable es mantenerlos bajo el 50%."
                    ),
                    "icon": "🏠",
                }
            )

    # 6. Daily spending tip
    if avg_daily > 0:
        days_left = (month_end - today).days
        if days_left > 0 and monthly_income > 0:
            # Use the same formula as compute_summary for consistency
            from app.models import FixedExpense, ExtraIncome

            fixed_total = session.scalar(
                select(func.coalesce(func.sum(FixedExpense.amount), 0)).where(
                    FixedExpense.user_id == user_id
                )
            ) or Decimal("0")
            fixed_total = Decimal(fixed_total).quantize(Decimal("0.01"))

            extra_month = session.scalar(
                select(func.coalesce(func.sum(ExtraIncome.amount), 0)).where(
                    ExtraIncome.user_id == user_id,
                    ExtraIncome.received_at >= month_start,
                    ExtraIncome.received_at <= month_end,
                )
            ) or Decimal("0")
            extra_month = Decimal(extra_month).quantize(Decimal("0.01"))

            # Calculate savings the same way as budget service
            if us and us.savings_mode == "fixed":
                savings = max(Decimal("0"), min(us.savings_amount, monthly_income))
            else:
                savings = (monthly_income * us.savings_percent / Decimal("100")) if us else Decimal("0")
            savings = savings.quantize(Decimal("0.01"))

            effective_income = monthly_income + extra_month
            remaining = effective_income - savings - fixed_total - total_spent
            daily_budget = (remaining / days_left).quantize(Decimal("0.01"))

            if daily_budget > 0:
                insights.append(
                    {
                        "type": "info",
                        "title": "Presupuesto diario restante",
                        "message": (
                            f"Te quedan {remaining}€ para {days_left} días. "
                            f"Puedes gastar hasta {daily_budget}€/día."
                        ),
                        "icon": "📅",
                    }
                )
            else:
                insights.append(
                    {
                        "type": "warning",
                        "title": "Presupuesto agotado",
                        "message": (
                            f"Has superado tu presupuesto mensual. "
                            f"Te quedan {remaining}€ para {days_left} días."
                        ),
                        "icon": "🚨",
                    }
                )

    # Fallback if no insights generated
    if not insights:
        insights.append(
            {
                "type": "info",
                "title": "Sigue registrando",
                "message": (
                    "Registra más gastos para recibir insights personalizados "
                    "sobre tus hábitos de consumo."
                ),
                "icon": "💡",
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
