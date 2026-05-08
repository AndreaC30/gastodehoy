"""SQLAlchemy ORM models.

A single ``User`` owns one ``UserSettings`` row plus N ``FixedExpense``
and ``VariableExpense`` rows. Every relationship cascades on delete so
removing a user cleans up everything they own.
"""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    """Account: email + bcrypt password + recovery code."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    password_changed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Hash bcrypt del código de recuperación de un solo uso. NULL si no hay
    # código activo (se invalida al usarse hasta generar uno nuevo).
    recovery_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)

    settings: Mapped["UserSettings"] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )
    fixed_expenses: Mapped[list["FixedExpense"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    variable_expenses: Mapped[list["VariableExpense"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class UserSettings(Base):
    """Per-user budget configuration (income + savings rule)."""

    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    monthly_income: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0"), nullable=False
    )
    # "percent" => savings = income * savings_percent / 100
    # "fixed"   => savings = savings_amount (independiente del ingreso)
    savings_mode: Mapped[str] = mapped_column(
        String(16), default="percent", nullable=False
    )
    savings_percent: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("0"), nullable=False
    )
    savings_amount: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0"), nullable=False
    )

    user: Mapped[User] = relationship(back_populates="settings")


class FixedExpense(Base):
    """Recurring monthly expense (rent, subscriptions...)."""

    __tablename__ = "fixed_expenses"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)

    user: Mapped[User] = relationship(back_populates="fixed_expenses")


class VariableExpense(Base):
    """One-off / day-to-day expense, dated."""

    __tablename__ = "variable_expenses"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    occurred_at: Mapped[date] = mapped_column(Date, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped[User] = relationship(back_populates="variable_expenses")
