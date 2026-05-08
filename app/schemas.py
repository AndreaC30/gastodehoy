from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

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


class RegisterRequest(BaseModel):
    email: EmailStr
    name: str
    password: str

    @field_validator("name")
    @classmethod
    def _name(cls, v: str) -> str:
        return _validate_name(v)

    @field_validator("password")
    @classmethod
    def _pwd(cls, v: str) -> str:
        return _validate_password(v)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def _pwd(cls, v: str) -> str:
        return _validate_password(v)


class UserPublic(BaseModel):
    id: int
    email: EmailStr
    name: str

    model_config = ConfigDict(from_attributes=True)


class UpdateName(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def _name(cls, v: str) -> str:
        return _validate_name(v)


class ChangePassword(BaseModel):
    current_password: str
    new_password: str

    @field_validator("current_password", "new_password")
    @classmethod
    def _pwd(cls, v: str) -> str:
        return _validate_password(v)


class DeleteAccount(BaseModel):
    password: str

    @field_validator("password")
    @classmethod
    def _pwd(cls, v: str) -> str:
        return _validate_password(v)


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
