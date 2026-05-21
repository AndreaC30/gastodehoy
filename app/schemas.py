"""Pydantic request/response schemas.

These are the wire shapes used by the FastAPI routers; database models
live in ``app.models``. Schemas with ``model_config = ConfigDict(
from_attributes=True)`` can be built directly from an ORM instance.
"""

from datetime import date
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

from app.auth import (
    NAME_MAX_LEN,
    NAME_MIN_LEN,
    PASSWORD_MAX_LEN,
    PASSWORD_MIN_LEN,
)


def _validate_password(value: str) -> str:
    if not (PASSWORD_MIN_LEN <= len(value) <= PASSWORD_MAX_LEN):
        raise ValueError(
            f"La contraseña debe tener entre {PASSWORD_MIN_LEN} y {PASSWORD_MAX_LEN} caracteres"
        )
    return value


def _validate_name(value: str) -> str:
    s = value.strip()
    if not (NAME_MIN_LEN <= len(s) <= NAME_MAX_LEN):
        raise ValueError(
            f"El nombre debe tener entre {NAME_MIN_LEN} y {NAME_MAX_LEN} caracteres"
        )
    return s


PasswordStr = Annotated[str, AfterValidator(_validate_password)]
NameStr = Annotated[str, AfterValidator(_validate_name)]


class RegisterRequest(BaseModel):
    email: EmailStr
    name: NameStr
    password: PasswordStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: PasswordStr


class UserPublic(BaseModel):
    id: int
    email: EmailStr
    name: str
    must_change_password: bool = False

    model_config = ConfigDict(from_attributes=True)

    @field_validator("must_change_password", mode="before")
    @classmethod
    def _coerce_must_change(cls, v: object) -> bool:
        """SQLite puede exponer 0/1 antes de la coerción a bool."""
        if v in (True, 1, "1", "true", "True"):
            return True
        return False


class RegisterResponse(BaseModel):
    user: UserPublic


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    """Mismo texto si el correo existe o no (anti-enumeración)."""

    detail: str


class UpdateName(BaseModel):
    name: NameStr


class ChangePassword(BaseModel):
    current_password: PasswordStr
    new_password: PasswordStr


class DeleteAccount(BaseModel):
    password: PasswordStr


SavingsMode = Literal["percent", "fixed"]


class BudgetSettings(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    monthly_income: Decimal = Field(ge=0, decimal_places=2)
    savings_mode: SavingsMode = "percent"
    savings_percent: Decimal = Field(default=Decimal("0"), ge=0, le=100, decimal_places=2)
    savings_amount: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)


class FixedExpenseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    amount: Decimal = Field(ge=0, decimal_places=2)
    icon: str | None = Field(default=None, max_length=40)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("El nombre no puede estar vacío")
        return s


class FixedExpenseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    amount: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    icon: str | None = Field(default=None, max_length=40)

    @field_validator("name")
    @classmethod
    def name_strip_optional(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        if not s:
            raise ValueError("El nombre no puede estar vacío")
        return s


class FixedExpenseRead(BaseModel):
    id: int
    name: str
    amount: Decimal
    icon: str | None = None

    model_config = {"from_attributes": True}


class VariableExpenseCreate(BaseModel):
    amount: Decimal = Field(gt=0, decimal_places=2)
    occurred_at: date | None = None
    note: str | None = Field(default=None, max_length=2000)
    category_id: int | None = None


class VariableExpenseUpdate(BaseModel):
    amount: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    occurred_at: date | None = None
    note: str | None = Field(default=None, max_length=2000)
    category_id: int | None = None

    @field_validator("note")
    @classmethod
    def note_strip_optional(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        return s if s else None


class VariableExpenseRead(BaseModel):
    id: int
    amount: Decimal
    occurred_at: date
    note: str | None
    category_id: int | None
    category_name: str | None = None
    category_color: str | None = None
    category_icon: str | None = None

    model_config = {"from_attributes": True}


class ExtraIncomeCreate(BaseModel):
    amount: Decimal = Field(gt=0, decimal_places=2)
    received_at: date | None = None
    savings_mode: str = Field(default="none", pattern=r"^(none|all|percent|fixed)$")
    savings_percent: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    savings_fixed: Decimal = Field(default=Decimal("0"), ge=0)

    @model_validator(mode="after")
    def validate_savings(self) -> "ExtraIncomeCreate":
        if self.savings_mode == "fixed" and self.savings_fixed > self.amount:
            raise ValueError(
                "La cantidad a ahorrar no puede ser mayor que el ingreso extra."
            )
        return self


class ExtraIncomeRead(BaseModel):
    id: int
    amount: Decimal
    received_at: date
    savings_mode: str
    savings_percent: Decimal
    savings_fixed: Decimal

    model_config = {"from_attributes": True}


# --- Categories --------------------------------------------------------------


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    color: str = Field(
        default="#6366f1",
        pattern=r"^#[0-9a-fA-F]{6}$",
    )
    icon: str | None = Field(default=None, max_length=40)
    monthly_budget: Decimal | None = Field(default=None, ge=0)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("El nombre no puede estar vacío")
        return s


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    color: str | None = Field(
        default=None,
        pattern=r"^#[0-9a-fA-F]{6}$",
    )
    icon: str | None = Field(default=None, max_length=40)
    monthly_budget: Decimal | None = Field(default=None, ge=0)

    @field_validator("name")
    @classmethod
    def name_strip_optional(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        if not s:
            raise ValueError("El nombre no puede estar vacío")
        return s


class CategoryRead(BaseModel):
    id: int
    name: str
    color: str
    icon: str | None
    monthly_budget: Decimal | None = None
    is_default: bool

    model_config = {"from_attributes": True}


# --- Insights ----------------------------------------------------------------


class CategorySpending(BaseModel):
    category_id: int | None
    category_name: str
    category_color: str
    category_icon: str | None = None
    total: Decimal
    percentage: Decimal
    transaction_count: int
    monthly_budget: Decimal | None = None
    over_budget: bool = False
    budget_used_percent: Decimal | None = None


class InsightItem(BaseModel):
    type: Literal["warning", "tip", "success", "info"]
    title: str
    message: str
    icon: str = "lightbulb"


class InsightsRead(BaseModel):
    period_start: date
    period_end: date
    total_spent: Decimal
    top_category: CategorySpending | None
    category_breakdown: list[CategorySpending]
    insights: list[InsightItem]
    avg_daily_spend: Decimal
    projected_monthly: Decimal


# --- Savings goals -----------------------------------------------------------


class SavingsGoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    target_amount: Decimal = Field(gt=0, decimal_places=2)
    current_amount: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)
    target_date: date | None = None

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("El nombre no puede estar vacío")
        return s


class SavingsGoalUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    target_amount: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    current_amount: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    target_date: date | None = None

    @field_validator("name")
    @classmethod
    def name_strip_optional(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        if not s:
            raise ValueError("El nombre no puede estar vacío")
        return s


class SavingsGoalRead(BaseModel):
    id: int
    name: str
    target_amount: Decimal
    current_amount: Decimal
    target_date: date | None

    model_config = ConfigDict(from_attributes=True)


class PaginatedMeta(BaseModel):
    """Pagination metadata."""

    total: int
    limit: int
    offset: int


class PaginatedFixedExpenses(BaseModel):
    items: list[FixedExpenseRead]
    meta: PaginatedMeta


class PaginatedVariableExpenses(BaseModel):
    items: list[VariableExpenseRead]
    meta: PaginatedMeta


class PaginatedExtraIncomes(BaseModel):
    items: list[ExtraIncomeRead]
    meta: PaginatedMeta


class SummaryRead(BaseModel):
    reference_date: date
    days_remaining_in_month: int
    monthly_income: Decimal
    extra_income_month: Decimal
    extra_income_saved_month: Decimal
    savings_mode: SavingsMode
    savings_percent: Decimal
    savings_amount: Decimal
    fixed_expenses_total: Decimal
    variable_spent_month: Decimal
    monthly_budget_after_fixed_and_savings: Decimal
    remaining_this_month: Decimal
    suggested_spend_today: Decimal


class MonthHistoryItem(BaseModel):
    year: int
    month: int
    month_label: str
    period_start: date
    period_end: date
    variable_spent_month: Decimal
    savings_amount: Decimal
    remaining_this_month: Decimal


class MonthHistoryRead(BaseModel):
    months: list[MonthHistoryItem]


class Rule503020Read(BaseModel):
    year: int
    month: int
    income: Decimal
    savings_amount: Decimal
    needs_spent: Decimal
    wants_spent: Decimal
    other_spent: Decimal
    needs_pct: Decimal
    wants_pct: Decimal
    savings_pct: Decimal
    target_needs_pct: Decimal
    target_wants_pct: Decimal
    target_savings_pct: Decimal
    insights: list[str]
