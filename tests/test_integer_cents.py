"""Integer cents in SQLite: exact sums, and a one-time legacy conversion."""

from decimal import Decimal

from sqlalchemy import create_engine, text

from app.database import _migrate_money_to_integer_cents, apply_sqlite_migrations


def test_api_ten_and_twenty_cents_sum_to_thirty(client) -> None:
    """0.10 + 0.20 is 0.30 because the database sums integer cents."""
    first = client.post("/api/expenses", json={"amount": "0.10"})
    second = client.post("/api/expenses", json={"amount": "0.20"})
    assert first.status_code == 200
    assert second.status_code == 200

    summary = client.get("/api/summary")
    assert summary.status_code == 200
    assert Decimal(str(summary.json()["variable_spent_month"])) == Decimal("0.30")

    from app.database import engine

    with engine.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT amount, typeof(amount) FROM variable_expenses ORDER BY amount"
            )
        ).all()
    assert rows == [(10, "integer"), (20, "integer")]
    assert sum(amount for amount, _typeof in rows) == 30


def test_legacy_real_money_converts_once_half_up(tmp_path) -> None:
    """Existing REAL euros become cents. A second startup does not convert again."""
    engine = create_engine(f"sqlite:///{tmp_path / 'legacy.db'}")
    with engine.begin() as conn:
        conn.execute(
            text(
                "CREATE TABLE users ("
                "  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,"
                "  email VARCHAR(255) NOT NULL UNIQUE,"
                "  name VARCHAR(80) NOT NULL,"
                "  password_hash VARCHAR(255) NOT NULL,"
                "  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL"
                ")"
            )
        )
        conn.execute(
            text(
                "CREATE TABLE user_settings ("
                "  id INTEGER NOT NULL,"
                "  user_id INTEGER NOT NULL,"
                "  monthly_income NUMERIC(14, 2) NOT NULL,"
                "  savings_mode VARCHAR(16) NOT NULL,"
                "  savings_percent NUMERIC(5, 2) NOT NULL,"
                "  savings_amount NUMERIC(14, 2) NOT NULL,"
                "  PRIMARY KEY (id),"
                "  UNIQUE (user_id),"
                "  FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE"
                ")"
            )
        )
        conn.execute(
            text(
                "CREATE TABLE expense_categories ("
                "  id INTEGER NOT NULL,"
                "  user_id INTEGER NOT NULL,"
                "  name VARCHAR(80) NOT NULL,"
                "  color VARCHAR(7) NOT NULL,"
                "  icon VARCHAR(40),"
                "  is_default BOOLEAN NOT NULL DEFAULT 0,"
                "  monthly_budget NUMERIC(14, 2),"
                "  PRIMARY KEY (id),"
                "  FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE"
                ")"
            )
        )
        conn.execute(
            text(
                "CREATE TABLE fixed_expenses ("
                "  id INTEGER NOT NULL,"
                "  user_id INTEGER NOT NULL,"
                "  name VARCHAR(255) NOT NULL,"
                "  amount NUMERIC(14, 2) NOT NULL,"
                "  PRIMARY KEY (id),"
                "  FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE"
                ")"
            )
        )
        conn.execute(
            text(
                "CREATE TABLE variable_expenses ("
                "  id INTEGER NOT NULL,"
                "  user_id INTEGER NOT NULL,"
                "  amount NUMERIC(14, 2) NOT NULL,"
                "  occurred_at DATE NOT NULL,"
                "  note TEXT,"
                "  PRIMARY KEY (id),"
                "  FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE"
                ")"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX idx_variable_expenses_user_date "
                "ON variable_expenses(user_id, occurred_at)"
            )
        )
        conn.execute(
            text(
                "CREATE TABLE extra_incomes ("
                "  id INTEGER NOT NULL,"
                "  user_id INTEGER NOT NULL,"
                "  amount NUMERIC(14, 2) NOT NULL,"
                "  received_at DATE NOT NULL,"
                "  savings_mode VARCHAR(16) NOT NULL DEFAULT 'none',"
                "  savings_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,"
                "  savings_fixed NUMERIC(14, 2) NOT NULL DEFAULT 0,"
                "  PRIMARY KEY (id),"
                "  FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE"
                ")"
            )
        )
        conn.execute(
            text(
                "CREATE TABLE savings_goals ("
                "  id INTEGER NOT NULL,"
                "  user_id INTEGER NOT NULL,"
                "  name VARCHAR(80) NOT NULL,"
                "  target_amount NUMERIC(14, 2) NOT NULL,"
                "  current_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,"
                "  target_date DATE,"
                "  PRIMARY KEY (id),"
                "  FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE"
                ")"
            )
        )
        conn.execute(
            text(
                "INSERT INTO users (id, email, name, password_hash) "
                "VALUES (1, 'legacy@example.com', 'Legacy', 'x')"
            )
        )
        conn.execute(
            text(
                "INSERT INTO user_settings "
                "(id, user_id, monthly_income, savings_mode, savings_percent, savings_amount) "
                "VALUES (7, 1, 0.10, 'percent', 33.33, 0.20)"
            )
        )
        conn.execute(
            text(
                "INSERT INTO expense_categories "
                "(id, user_id, name, color, icon, is_default, monthly_budget) "
                "VALUES (1, 1, 'Supermercado', '#22c55e', 'Cart', 1, NULL),"
                "       (2, 1, 'Legacy', '#111111', 'Tag', 0, 10.10)"
            )
        )
        conn.execute(
            text(
                "INSERT INTO fixed_expenses (id, user_id, name, amount) "
                "VALUES (3, 1, 'Luz', 19.99)"
            )
        )
        conn.execute(
            text(
                "INSERT INTO variable_expenses (id, user_id, amount, occurred_at) "
                "VALUES (1, 1, 0.10, '2026-05-01'),"
                "       (2, 1, 0.20, '2026-05-02'),"
                "       (3, 1, 0.005, '2026-05-03')"
            )
        )
        conn.execute(
            text(
                "INSERT INTO extra_incomes "
                "(id, user_id, amount, received_at, savings_mode, savings_percent, savings_fixed) "
                "VALUES (4, 1, 2.675, '2026-05-04', 'fixed', 25, 0.10)"
            )
        )
        conn.execute(
            text(
                "INSERT INTO savings_goals "
                "(id, user_id, name, target_amount, current_amount) "
                "VALUES (5, 1, 'Viaje', 1.005, 0.005)"
            )
        )

    apply_sqlite_migrations(engine)

    with engine.connect() as conn:
        settings = conn.execute(
            text(
                "SELECT id, monthly_income, typeof(monthly_income), "
                "savings_amount, typeof(savings_amount), savings_percent "
                "FROM user_settings"
            )
        ).one()
        assert settings[0] == 7
        assert (settings[1], settings[2]) == (10, "integer")
        assert (settings[3], settings[4]) == (20, "integer")
        assert Decimal(str(settings[5])).quantize(Decimal("0.01")) == Decimal("33.33")

        variables = conn.execute(
            text(
                "SELECT id, amount, typeof(amount) FROM variable_expenses ORDER BY id"
            )
        ).all()
        assert variables == [
            (1, 10, "integer"),
            (2, 20, "integer"),
            (3, 1, "integer"),
        ]
        assert conn.execute(text("SELECT COUNT(*) FROM variable_expenses")).scalar() == 3
        assert (
            conn.execute(text("SELECT SUM(amount) FROM variable_expenses")).scalar()
            == 31
        )

        fixed = conn.execute(
            text("SELECT id, amount, typeof(amount) FROM fixed_expenses")
        ).one()
        assert fixed == (3, 1999, "integer")

        extra = conn.execute(
            text(
                "SELECT id, amount, savings_fixed, typeof(savings_fixed), savings_percent "
                "FROM extra_incomes"
            )
        ).one()
        assert extra[0] == 4
        assert extra[1] == 268
        assert (extra[2], extra[3]) == (10, "integer")
        assert Decimal(str(extra[4])).quantize(Decimal("0.01")) == Decimal("25.00")

        goal = conn.execute(
            text(
                "SELECT id, target_amount, current_amount FROM savings_goals"
            )
        ).one()
        assert goal == (5, 101, 1)

        budgets = conn.execute(
            text(
                "SELECT id, monthly_budget, typeof(monthly_budget) "
                "FROM expense_categories ORDER BY id"
            )
        ).all()
        assert budgets[0][0] == 1
        assert budgets[0][1] is None
        assert budgets[1] == (2, 1010, "integer")

        index_names = {
            row[0]
            for row in conn.execute(
                text(
                    "SELECT name FROM sqlite_master "
                    "WHERE type='index' AND tbl_name='variable_expenses'"
                )
            ).all()
        }
        assert "idx_variable_expenses_user_date" in index_names

        fks = conn.execute(text("PRAGMA foreign_key_list(variable_expenses)")).all()
        assert any(row[2] == "users" and row[6] == "CASCADE" for row in fks)
        assert any(
            row[2] == "expense_categories" and row[6] == "SET NULL" for row in fks
        )
        settings_sql = conn.execute(
            text(
                "SELECT sql FROM sqlite_master "
                "WHERE type='table' AND name='user_settings'"
            )
        ).scalar()
        assert "UNIQUE" in settings_sql

    apply_sqlite_migrations(engine)

    with engine.connect() as conn:
        again = conn.execute(
            text("SELECT amount FROM variable_expenses ORDER BY id")
        ).all()
        assert [row[0] for row in again] == [10, 20, 1]
        assert conn.execute(text("SELECT COUNT(*) FROM variable_expenses")).scalar() == 3
        assert conn.execute(
            text("SELECT monthly_income, savings_amount FROM user_settings")
        ).one() == (10, 20)


def test_autoincrement_does_not_reuse_deleted_ids(tmp_path) -> None:
    engine = create_engine(f"sqlite:///{tmp_path / 'seq.db'}")
    with engine.begin() as conn:
        conn.execute(
            text(
                "CREATE TABLE fixed_expenses ("
                " id INTEGER PRIMARY KEY AUTOINCREMENT,"
                " user_id INTEGER NOT NULL,"
                " name VARCHAR(255) NOT NULL,"
                " amount NUMERIC NOT NULL"
                ")"
            )
        )
        conn.execute(
            text(
                "INSERT INTO fixed_expenses (user_id, name, amount) "
                "VALUES (1, 'A', 1.50), (1, 'B', 2.50)"
            )
        )
        conn.execute(text("DELETE FROM fixed_expenses WHERE id=2"))

    _migrate_money_to_integer_cents(engine)

    with engine.begin() as conn:
        kept = conn.execute(
            text("SELECT id, amount, typeof(amount) FROM fixed_expenses")
        ).one()
        assert kept == (1, 150, "integer")
        conn.execute(
            text(
                "INSERT INTO fixed_expenses (user_id, name, amount) "
                "VALUES (1, 'C', 3)"
            )
        )
        ids = [
            row[0]
            for row in conn.execute(
                text("SELECT id FROM fixed_expenses ORDER BY id")
            ).all()
        ]
        assert ids == [1, 3]
