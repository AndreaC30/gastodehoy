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
    # client_id survives the money-check rebuild because its step runs after it.
    assert "client_id" in variable_sql
    with engine.connect() as conn:
        index_sql = conn.execute(
            text(
                "SELECT sql FROM sqlite_master "
                "WHERE type = 'index' AND name = 'ux_variable_expenses_user_client'"
            )
        ).scalar()
    assert index_sql and "UNIQUE" in index_sql and "client_id IS NOT NULL" in index_sql

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


def test_client_id_is_added_to_a_database_that_lacks_it() -> None:
    engine = _memory_engine()
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE variable_expenses DROP COLUMN client_id"))
        conn.execute(
            text(
                "INSERT INTO users (email, name, password_hash) "
                "VALUES ('old@example.com', 'Old', 'x')"
            )
        )
        uid = conn.execute(
            text("SELECT id FROM users WHERE email = 'old@example.com'")
        ).scalar()
        conn.execute(
            text(
                "INSERT INTO variable_expenses (user_id, amount, occurred_at) "
                "VALUES (:uid, 350, '2026-01-01')"
            ),
            {"uid": uid},
        )

    apply_sqlite_migrations(engine)
    apply_sqlite_migrations(engine)  # a second startup changes nothing

    with engine.connect() as conn:
        cols = {r[1] for r in conn.execute(text("PRAGMA table_info(variable_expenses)"))}
        assert "client_id" in cols
        assert conn.execute(text("SELECT COUNT(*) FROM variable_expenses")).scalar() == 1
        # The partial unique index: two NULL keys are fine, a repeated key is not.
        conn.close()
    with engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO variable_expenses (user_id, amount, occurred_at, client_id) "
                "VALUES (:uid, 100, '2026-01-02', 'abcdefgh1')"
            ),
            {"uid": uid},
        )
    with pytest.raises(IntegrityError):
        with engine.begin() as conn:
            conn.execute(
                text(
                    "INSERT INTO variable_expenses (user_id, amount, occurred_at, client_id) "
                    "VALUES (:uid, 100, '2026-01-02', 'abcdefgh1')"
                ),
                {"uid": uid},
            )
