"""Schema steps are recorded once. SQLite rejects bad money rows."""

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.database import SCHEMA_MIGRATION_IDS, Base, apply_sqlite_migrations


def _memory_engine():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    return engine


def _versions(conn) -> list[str]:
    return [
        row[0]
        for row in conn.execute(
            text("SELECT version FROM schema_migrations ORDER BY version")
        )
    ]


def test_schema_migrations_run_once_and_reject_bad_money() -> None:
    engine = _memory_engine()
    with engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO users (email, name, password_hash) "
                "VALUES ('schema-mig@example.com', 'Schema', 'x')"
            )
        )
        user_id = conn.execute(
            text("SELECT id FROM users WHERE email = 'schema-mig@example.com'")
        ).scalar()
        conn.execute(
            text(
                "INSERT INTO user_settings ("
                "user_id, monthly_income, savings_mode, savings_percent, savings_amount"
                ") VALUES (:uid, 0, 'fixed', 0, 0)"
            ),
            {"uid": user_id},
        )
        conn.execute(
            text(
                "INSERT INTO fixed_expenses (user_id, name, amount) "
                "VALUES (:uid, 'Rent', 0)"
            ),
            {"uid": user_id},
        )
        conn.execute(
            text(
                "INSERT INTO variable_expenses (user_id, amount, occurred_at) "
                "VALUES (:uid, 0, '2026-01-01')"
            ),
            {"uid": user_id},
        )
        conn.execute(
            text(
                "INSERT INTO extra_incomes ("
                "user_id, amount, received_at, savings_mode, savings_percent, savings_fixed"
                ") VALUES (:uid, 0, '2026-01-01', 'all', 0, 0)"
            ),
            {"uid": user_id},
        )
        conn.execute(
            text(
                "INSERT INTO savings_goals ("
                "user_id, name, target_amount, current_amount"
                ") VALUES (:uid, 'Casa', 0, 0)"
            ),
            {"uid": user_id},
        )

    apply_sqlite_migrations(engine)

    with engine.connect() as conn:
        first = _versions(conn)
        assert len(first) == len(set(first))
        assert set(first) == set(SCHEMA_MIGRATION_IDS)
        assert (
            conn.execute(
                text(
                    "SELECT COUNT(*) FROM schema_migrations WHERE applied_at IS NULL"
                )
            ).scalar()
            == 0
        )
        settings = conn.execute(
            text(
                "SELECT savings_mode, language FROM user_settings WHERE user_id = :uid"
            ),
            {"uid": user_id},
        ).one()
        assert settings[0] == "fixed"
        assert settings[1] is None
        assert (
            conn.execute(
                text("SELECT savings_mode FROM extra_incomes WHERE user_id = :uid"),
                {"uid": user_id},
            ).scalar()
            == "all"
        )
        user_sql = conn.execute(
            text(
                "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'user_settings'"
            )
        ).scalar()
        extra_sql = conn.execute(
            text(
                "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'extra_incomes'"
            )
        ).scalar()
        fixed_sql = conn.execute(
            text(
                "SELECT sql FROM sqlite_master "
                "WHERE type = 'table' AND name = 'fixed_expenses'"
            )
        ).scalar()
        variable_sql = conn.execute(
            text(
                "SELECT sql FROM sqlite_master "
                "WHERE type = 'table' AND name = 'variable_expenses'"
            )
        ).scalar()
        goal_sql = conn.execute(
            text(
                "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'savings_goals'"
            )
        ).scalar()
        category_sql = conn.execute(
            text(
                "SELECT sql FROM sqlite_master "
                "WHERE type = 'table' AND name = 'expense_categories'"
            )
        ).scalar()

    assert "CHECK (monthly_income >= 0)" in user_sql
    assert "CHECK (savings_amount >= 0)" in user_sql
    assert "CHECK (savings_mode IN ('percent', 'fixed'))" in user_sql
    assert "CHECK (savings_percent" not in user_sql
    assert "CHECK (amount >= 0)" in fixed_sql
    assert "CHECK (amount >= 0)" in variable_sql
    assert "CHECK (amount >= 0)" in extra_sql
    assert "CHECK (savings_fixed >= 0)" in extra_sql
    assert "CHECK (savings_mode IN ('none', 'all', 'percent', 'fixed'))" in extra_sql
    assert "CHECK (savings_percent" not in extra_sql
    assert "CHECK (target_amount >= 0)" in goal_sql
    assert "CHECK (current_amount >= 0)" in goal_sql
    assert "monthly_budget" in category_sql
    assert "CHECK" not in category_sql

    apply_sqlite_migrations(engine)

    with engine.connect() as conn:
        assert _versions(conn) == first

    with engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO users (email, name, password_hash) "
                "VALUES ('schema-mig-bad@example.com', 'Bad', 'x')"
            )
        )
        bad_id = conn.execute(
            text("SELECT id FROM users WHERE email = 'schema-mig-bad@example.com'")
        ).scalar()

    def reject(sql: str) -> None:
        with pytest.raises(IntegrityError, match="CHECK constraint failed"):
            with engine.begin() as conn:
                conn.execute(text(sql), {"uid": bad_id})

    reject(
        "INSERT INTO user_settings ("
        "user_id, monthly_income, savings_mode, savings_percent, savings_amount"
        ") VALUES (:uid, 1, 'all', 0, 0)"
    )
    reject(
        "INSERT INTO user_settings ("
        "user_id, monthly_income, savings_mode, savings_percent, savings_amount"
        ") VALUES (:uid, -1, 'percent', 0, 0)"
    )
    reject(
        "INSERT INTO user_settings ("
        "user_id, monthly_income, savings_mode, savings_percent, savings_amount"
        ") VALUES (:uid, 1, 'fixed', 0, -1)"
    )
    reject(
        "INSERT INTO fixed_expenses (user_id, name, amount) VALUES (:uid, 'Rent', -1)"
    )
    reject(
        "INSERT INTO variable_expenses (user_id, amount, occurred_at) "
        "VALUES (:uid, -1, '2026-01-01')"
    )
    reject(
        "INSERT INTO extra_incomes ("
        "user_id, amount, received_at, savings_mode, savings_percent, savings_fixed"
        ") VALUES (:uid, 10, '2026-01-01', 'weekly', 0, 0)"
    )
    reject(
        "INSERT INTO extra_incomes ("
        "user_id, amount, received_at, savings_mode, savings_percent, savings_fixed"
        ") VALUES (:uid, -1, '2026-01-01', 'none', 0, 0)"
    )
    reject(
        "INSERT INTO extra_incomes ("
        "user_id, amount, received_at, savings_mode, savings_percent, savings_fixed"
        ") VALUES (:uid, 10, '2026-01-01', 'fixed', 0, -1)"
    )
    reject(
        "INSERT INTO savings_goals (user_id, name, target_amount, current_amount) "
        "VALUES (:uid, 'Coche', -1, 0)"
    )
    reject(
        "INSERT INTO savings_goals (user_id, name, target_amount, current_amount) "
        "VALUES (:uid, 'Coche', 10, -1)"
    )
