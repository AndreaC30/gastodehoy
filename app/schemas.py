from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BudgetSettings(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    monthly_income: Decimal = Field(ge=0, decimal_places=2)
    savings_percent: Decimal = Field(ge=0, le=100, decimal_places=2)


class FixedExpenseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    amount: Decimal = Field(ge=0, decimal_places=2)

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

    model_config = {"from_attributes": True}


class VariableExpenseCreate(BaseModel):
    amount: Decimal = Field(gt=0, decimal_places=2)
    occurred_at: date | None = None
    note: str | None = Field(default=None, max_length=2000)


class VariableExpenseRead(BaseModel):
    id: int
    amount: Decimal
    occurred_at: date
    note: str | None

    model_config = {"from_attributes": True}


class SummaryRead(BaseModel):
    reference_date: date
    days_remaining_in_month: int
    monthly_income: Decimal
    savings_percent: Decimal
    savings_amount: Decimal
    fixed_expenses_total: Decimal
    variable_spent_month: Decimal
    monthly_budget_after_fixed_and_savings: Decimal
    remaining_this_month: Decimal
    suggested_spend_today: Decimal
