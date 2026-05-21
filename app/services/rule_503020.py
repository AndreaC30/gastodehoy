"""50/30/20 budget rule: classify spending into needs, wants, and savings."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Literal

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.models import ExpenseCategory, ExtraIncome, FixedExpense, UserSettings, VariableExpense
from app.services.budget import month_bounds
from app.services.extra_income_savings import spendable_from_extra

CategoryBucket = Literal["need", "want", "other"]

CATEGORY_BUCKET: dict[str, CategoryBucket] = {
    "Comida": "need",
    "Supermercado": "need",
    "Transporte": "need",
    "Salud": "need",
    "Hogar": "need",
    "Educación": "need",
    "Ocio": "want",
    "Ropa": "want",
    "Otros": "other",
}

TARGET_NEEDS_PCT = Decimal("50")
TARGET_WANTS_PCT = Decimal("30")
TARGET_SAVINGS_PCT = Decimal("20")


def bucket_for_category_name(name: str | None) -> CategoryBucket:
    """Map a category label to need / want / other (unknown → other)."""
    if not name:
        return "other"
    return CATEGORY_BUCKET.get(name.strip(), "other")


def _effective_savings(us: UserSettings) -> Decimal:
    income = us.monthly_income
    if us.savings_mode == "fixed":
        return max(Decimal("0"), min(us.savings_amount, income))
    return (income * us.savings_percent / Decimal("100")).quantize(Decimal("0.01"))


def _safe_pct(part: Decimal, whole: Decimal) -> Decimal:
    if whole <= 0:
        return Decimal("0")
    return (part / whole * Decimal("100")).quantize(Decimal("0.01"))


def _build_insights(
    needs_pct: Decimal,
    wants_pct: Decimal,
    savings_pct: Decimal,
    income: Decimal,
) -> list[str]:
    messages: list[str] = []
    if income <= 0:
        messages.append(
            "Configura tu ingreso mensual en Tus ingresos para ver cómo encajas en la regla 50/30/20."
        )
        return messages

    if needs_pct > TARGET_NEEDS_PCT + Decimal("5"):
        messages.append(
            f"Tus necesidades representan el {needs_pct}% del ingreso; "
            f"la regla 50/30/20 sugiere no superar el {TARGET_NEEDS_PCT}%."
        )
    elif needs_pct <= TARGET_NEEDS_PCT:
        messages.append(
            f"Bien en necesidades: llevas el {needs_pct}% frente al objetivo del {TARGET_NEEDS_PCT}%."
        )

    if wants_pct > TARGET_WANTS_PCT + Decimal("5"):
        messages.append(
            f"El gasto en deseos llega al {wants_pct}%; "
            f"intenta mantenerlo cerca del {TARGET_WANTS_PCT}%."
        )
    elif wants_pct > 0 and wants_pct <= TARGET_WANTS_PCT:
        messages.append(
            f"Tus deseos están en el {wants_pct}%, dentro del margen del {TARGET_WANTS_PCT}%."
        )

    if savings_pct < TARGET_SAVINGS_PCT - Decimal("5"):
        messages.append(
            f"El ahorro planificado es el {savings_pct}% del ingreso; "
            f"la regla recomienda al menos un {TARGET_SAVINGS_PCT}%."
        )
    elif savings_pct >= TARGET_SAVINGS_PCT:
        messages.append(
            f"Tu ahorro planificado ({savings_pct}%) cumple el objetivo del {TARGET_SAVINGS_PCT}%."
        )

    if not messages:
        messages.append(
            "Sigue registrando gastos para afinar la comparación con la regla 50/30/20."
        )
    return messages


def compute_rule_503020(session: Session, user_id: int, month: date) -> dict:
    """Return 50/30/20 breakdown for the calendar month containing ``month``."""
    month_start, month_end = month_bounds(month)

    us = session.scalar(select(UserSettings).where(UserSettings.user_id == user_id))
    if us is None:
        income = Decimal("0")
        savings_amount = Decimal("0")
    else:
        income = us.monthly_income.quantize(Decimal("0.01"))
        savings_amount = _effective_savings(us)

    extra_rows = list(
        session.scalars(
            select(ExtraIncome).where(
                ExtraIncome.user_id == user_id,
                ExtraIncome.received_at >= month_start,
                ExtraIncome.received_at <= month_end,
            )
        ).all()
    )
    extra_spendable = sum(
        (spendable_from_extra(r) for r in extra_rows), start=Decimal("0")
    ).quantize(Decimal("0.01"))
    income = (income + extra_spendable).quantize(Decimal("0.01"))

    fixed_total = session.scalar(
        select(func.coalesce(func.sum(FixedExpense.amount), 0)).where(
            FixedExpense.user_id == user_id
        )
    ) or Decimal("0")
    fixed_total = Decimal(fixed_total).quantize(Decimal("0.01"))

    rows = session.execute(
        select(
            ExpenseCategory.name,
            func.coalesce(func.sum(VariableExpense.amount), 0),
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
        .group_by(ExpenseCategory.name)
    ).all()

    needs_variable = Decimal("0")
    wants_variable = Decimal("0")
    other_variable = Decimal("0")
    for cat_name, total in rows:
        bucket = bucket_for_category_name(cat_name)
        amount = Decimal(total).quantize(Decimal("0.01"))
        if bucket == "need":
            needs_variable += amount
        elif bucket == "want":
            wants_variable += amount
        else:
            other_variable += amount

    needs_spent = (fixed_total + needs_variable).quantize(Decimal("0.01"))
    wants_spent = wants_variable.quantize(Decimal("0.01"))
    other_spent = other_variable.quantize(Decimal("0.01"))

    needs_pct = _safe_pct(needs_spent, income)
    wants_pct = _safe_pct(wants_spent, income)
    savings_pct = _safe_pct(savings_amount, income)

    return {
        "year": month.year,
        "month": month.month,
        "income": income,
        "savings_amount": savings_amount,
        "needs_spent": needs_spent,
        "wants_spent": wants_spent,
        "other_spent": other_spent,
        "needs_pct": needs_pct,
        "wants_pct": wants_pct,
        "savings_pct": savings_pct,
        "target_needs_pct": TARGET_NEEDS_PCT,
        "target_wants_pct": TARGET_WANTS_PCT,
        "target_savings_pct": TARGET_SAVINGS_PCT,
        "insights": _build_insights(needs_pct, wants_pct, savings_pct, income),
    }
