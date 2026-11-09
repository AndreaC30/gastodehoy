"""SQLAlchemy engine, session factory and declarative ``Base``.

``get_db`` is the FastAPI dependency that gives a request-scoped session
and guarantees it gets closed.

For SQLite we apply two extras the moment a connection is opened:

* ``foreign_keys=ON``: SQLite ignores ``FOREIGN KEY`` constraints unless
  this pragma is set per-connection. Without it our ``ondelete=CASCADE``
  on ``FixedExpense.user_id`` etc. would not cascade.
* ``journal_mode=WAL``: write-ahead-log lets readers and a single writer
  proceed concurrently and survives the occasional crash without
  corrupting the database.
* ``busy_timeout=5000``: wait up to 5s on lock contention instead of
  failing immediately with "database is locked".
* ``synchronous=NORMAL``: safe with WAL; fewer fsyncs than FULL while
  keeping durability for typical single-host deployments.
"""

from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

_url = make_url(settings.database_url)
_is_sqlite = _url.get_backend_name() == "sqlite"

# For relative SQLite paths (e.g. ./data/gastodehoy.db), make sure the
# parent directory exists so the first connection does not fail.
if _is_sqlite and _url.database and _url.database != ":memory:":
    Path(_url.database).expanduser().parent.mkdir(parents=True, exist_ok=True)

_engine_kwargs: dict = {"pool_pre_ping": True}
if _is_sqlite:
    # SQLAlchemy uses a single shared connection for SQLite; let it be
    # used from FastAPI's threadpool.
    _engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(settings.database_url, **_engine_kwargs)


if _is_sqlite:

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_connection, _connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Stable ids, in apply order. A database that already has the current columns
# records the historical ids and does not run that DDL again.
SCHEMA_MIGRATION_IDS: tuple[str, ...] = (
    "users.autoincrement",
    "users.must_change_password",
    "users.terms_version",
    "users.terms_accepted_at",
    "users.minimum_age_confirmed",
    "users.lifetime_free",
    "users.password_reset_hash",
    "users.password_reset_expires_at",
    "expense_categories.table",
    "expense_categories.user_index",
    "variable_expenses.category_id",
    "variable_expenses.created_at",
    "variable_expenses.category_index",
    "variable_expenses.user_date_index",
    "extra_incomes.user_date_index",
    "extra_incomes.savings_mode",
    "extra_incomes.savings_percent",
    "extra_incomes.savings_fixed",
    "expense_categories.monthly_budget",
    "fixed_expenses.icon",
    "user_settings.language",
    "user_settings.dashboard_tour_completed",
    "user_settings.income_check_month",
    "user_settings.weekly_digest_opt_in",
    "savings_goals.table",
    "savings_goals.user_index",
    "push_subscriptions.table",
    "push_subscriptions.user_index",
    "login_attempts.email",
    "login_attempts.email_index",
    "revoked_sessions.table",
    "revoked_sessions.revoked_at_index",
    "user_settings.nonneg_and_savings_mode",
    "fixed_expenses.amount_nonneg",
    "variable_expenses.amount_nonneg",
    "extra_incomes.nonneg_and_savings_mode",
    "savings_goals.amounts_nonneg",
)


def _ensure_schema_migrations(engine: Engine) -> None:
    """Create the ledger. ``IF NOT EXISTS`` so a second startup is a no-op."""
    with engine.begin() as conn:
        conn.execute(
            text(
                "CREATE TABLE IF NOT EXISTS schema_migrations ("
                "version TEXT PRIMARY KEY, "
                "applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
                ")"
            )
        )


def _is_applied(conn, version: str) -> bool:
    found = conn.execute(
        text("SELECT 1 FROM schema_migrations WHERE version = :version"),
        {"version": version},
    ).scalar()
    return found is not None


def _mark_applied(conn, version: str) -> None:
    conn.execute(
        text(
            "INSERT INTO schema_migrations (version, applied_at) "
            "VALUES (:version, CURRENT_TIMESTAMP)"
        ),
        {"version": version},
    )


def _column_names(conn, table: str) -> set[str]:
    rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
    return {str(row[1]) for row in rows}


def _table_exists(conn, table: str) -> bool:
    found = conn.execute(
        text("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = :name"),
        {"name": table},
    ).scalar()
    return found is not None


def _add_column(conn, version: str, table: str, column: str, ddl: str) -> None:
    """Add a column, or only record the step when the column is already there."""
    if _is_applied(conn, version):
        return
    if column not in _column_names(conn, table):
        conn.execute(text(ddl))
    _mark_applied(conn, version)


def _ensure_table(conn, version: str, table: str, ddl: str) -> None:
    if _is_applied(conn, version):
        return
    if not _table_exists(conn, table):
        conn.execute(text(ddl))
    _mark_applied(conn, version)


def _ensure_index(conn, version: str, index_name: str, ddl: str) -> None:
    if _is_applied(conn, version):
        return
    found = conn.execute(
        text("SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = :name"),
        {"name": index_name},
    ).scalar()
    if found is None:
        conn.execute(text(ddl))
    _mark_applied(conn, version)


def _apply_historical_steps(conn) -> None:
    """Schema steps that already shipped. Existing columns are not altered again."""
    _add_column(
        conn,
        "users.must_change_password",
        "users",
        "must_change_password",
        "ALTER TABLE users ADD COLUMN must_change_password "
        "BOOLEAN NOT NULL DEFAULT 0",
    )
    _add_column(
        conn,
        "users.terms_version",
        "users",
        "terms_version",
        "ALTER TABLE users ADD COLUMN terms_version VARCHAR(32)",
    )
    _add_column(
        conn,
        "users.terms_accepted_at",
        "users",
        "terms_accepted_at",
        "ALTER TABLE users ADD COLUMN terms_accepted_at DATETIME",
    )
    _add_column(
        conn,
        "users.minimum_age_confirmed",
        "users",
        "minimum_age_confirmed",
        "ALTER TABLE users ADD COLUMN minimum_age_confirmed "
        "BOOLEAN NOT NULL DEFAULT 0",
    )
    _add_column(
        conn,
        "users.lifetime_free",
        "users",
        "lifetime_free",
        "ALTER TABLE users ADD COLUMN lifetime_free BOOLEAN NOT NULL DEFAULT 1",
    )
    _add_column(
        conn,
        "users.password_reset_hash",
        "users",
        "password_reset_hash",
        "ALTER TABLE users ADD COLUMN password_reset_hash VARCHAR(64)",
    )
    _add_column(
        conn,
        "users.password_reset_expires_at",
        "users",
        "password_reset_expires_at",
        "ALTER TABLE users ADD COLUMN password_reset_expires_at DATETIME",
    )
    _ensure_table(
        conn,
        "expense_categories.table",
        "expense_categories",
        "CREATE TABLE IF NOT EXISTS expense_categories ("
        "  id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,"
        "  name VARCHAR(80) NOT NULL,"
        "  color VARCHAR(7) NOT NULL DEFAULT '#6366f1',"
        "  icon VARCHAR(40),"
        "  is_default BOOLEAN NOT NULL DEFAULT 0"
        ")",
    )
    _ensure_index(
        conn,
        "expense_categories.user_index",
        "idx_expense_categories_user",
        "CREATE INDEX IF NOT EXISTS idx_expense_categories_user "
        "ON expense_categories(user_id)",
    )
    _add_column(
        conn,
        "variable_expenses.category_id",
        "variable_expenses",
        "category_id",
        "ALTER TABLE variable_expenses ADD COLUMN category_id "
        "INTEGER REFERENCES expense_categories(id) ON DELETE SET NULL",
    )
    _add_column(
        conn,
        "variable_expenses.created_at",
        "variable_expenses",
        "created_at",
        "ALTER TABLE variable_expenses ADD COLUMN created_at DATETIME",
    )
    _ensure_index(
        conn,
        "variable_expenses.category_index",
        "idx_variable_expenses_category",
        "CREATE INDEX IF NOT EXISTS idx_variable_expenses_category "
        "ON variable_expenses(category_id)",
    )
    _ensure_index(
        conn,
        "variable_expenses.user_date_index",
        "idx_variable_expenses_user_date",
        "CREATE INDEX IF NOT EXISTS idx_variable_expenses_user_date "
        "ON variable_expenses(user_id, occurred_at)",
    )
    _ensure_index(
        conn,
        "extra_incomes.user_date_index",
        "idx_extra_incomes_user_date",
        "CREATE INDEX IF NOT EXISTS idx_extra_incomes_user_date "
        "ON extra_incomes(user_id, received_at)",
    )
    _add_column(
        conn,
        "extra_incomes.savings_mode",
        "extra_incomes",
        "savings_mode",
        "ALTER TABLE extra_incomes ADD COLUMN savings_mode "
        "VARCHAR(16) NOT NULL DEFAULT 'none'",
    )
    _add_column(
        conn,
        "extra_incomes.savings_percent",
        "extra_incomes",
        "savings_percent",
        "ALTER TABLE extra_incomes ADD COLUMN savings_percent "
        "NUMERIC(5, 2) NOT NULL DEFAULT 0",
    )
    _add_column(
        conn,
        "extra_incomes.savings_fixed",
        "extra_incomes",
        "savings_fixed",
        "ALTER TABLE extra_incomes ADD COLUMN savings_fixed "
        "NUMERIC(14, 2) NOT NULL DEFAULT 0",
    )
    _add_column(
        conn,
        "expense_categories.monthly_budget",
        "expense_categories",
        "monthly_budget",
        "ALTER TABLE expense_categories ADD COLUMN monthly_budget NUMERIC(14, 2)",
    )
    _add_column(
        conn,
        "fixed_expenses.icon",
        "fixed_expenses",
        "icon",
        "ALTER TABLE fixed_expenses ADD COLUMN icon VARCHAR(40)",
    )
    _add_column(
        conn,
        "user_settings.language",
        "user_settings",
        "language",
        "ALTER TABLE user_settings ADD COLUMN language VARCHAR(5)",
    )
    _add_column(
        conn,
        "user_settings.dashboard_tour_completed",
        "user_settings",
        "dashboard_tour_completed",
        "ALTER TABLE user_settings ADD COLUMN dashboard_tour_completed "
        "BOOLEAN NOT NULL DEFAULT 0",
    )
    _add_column(
        conn,
        "user_settings.income_check_month",
        "user_settings",
        "income_check_month",
        "ALTER TABLE user_settings ADD COLUMN income_check_month VARCHAR(7)",
    )
    _add_column(
        conn,
        "user_settings.weekly_digest_opt_in",
        "user_settings",
        "weekly_digest_opt_in",
        "ALTER TABLE user_settings ADD COLUMN weekly_digest_opt_in "
        "BOOLEAN NOT NULL DEFAULT 0",
    )
    _ensure_table(
        conn,
        "savings_goals.table",
        "savings_goals",
        "CREATE TABLE IF NOT EXISTS savings_goals ("
        "  id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,"
        "  name VARCHAR(80) NOT NULL,"
        "  target_amount NUMERIC(14, 2) NOT NULL,"
        "  current_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,"
        "  target_date DATE"
        ")",
    )
    _ensure_index(
        conn,
        "savings_goals.user_index",
        "idx_savings_goals_user",
        "CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON savings_goals(user_id)",
    )
    _ensure_table(
        conn,
        "push_subscriptions.table",
        "push_subscriptions",
        "CREATE TABLE IF NOT EXISTS push_subscriptions ("
        "  id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,"
        "  endpoint TEXT NOT NULL UNIQUE,"
        "  p256dh VARCHAR(255) NOT NULL,"
        "  auth VARCHAR(128) NOT NULL,"
        "  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
        ")",
    )
    _ensure_index(
        conn,
        "push_subscriptions.user_index",
        "idx_push_subscriptions_user",
        "CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user "
        "ON push_subscriptions(user_id)",
    )
    if _table_exists(conn, "login_attempts"):
        _add_column(
            conn,
            "login_attempts.email",
            "login_attempts",
            "email",
            "ALTER TABLE login_attempts ADD COLUMN email VARCHAR(255)",
        )
        _ensure_index(
            conn,
            "login_attempts.email_index",
            "ix_login_attempts_email",
            "CREATE INDEX IF NOT EXISTS ix_login_attempts_email "
            "ON login_attempts(email)",
        )
    _ensure_table(
        conn,
        "revoked_sessions.table",
        "revoked_sessions",
        "CREATE TABLE IF NOT EXISTS revoked_sessions ("
        "  sid VARCHAR(64) NOT NULL PRIMARY KEY,"
        "  revoked_at DATETIME NOT NULL"
        ")",
    )
    _ensure_index(
        conn,
        "revoked_sessions.revoked_at_index",
        "ix_revoked_sessions_revoked_at",
        "CREATE INDEX IF NOT EXISTS ix_revoked_sessions_revoked_at "
        "ON revoked_sessions(revoked_at)",
    )


def _backfill_categories(conn) -> None:
    """Idempotent category data fixes. Not schema steps, so they stay repeatable."""
    from app.services.categories import _LEGACY_DEFAULT_CATEGORIES

    user_rows = conn.execute(text("SELECT id FROM users")).fetchall()
    for (uid,) in user_rows:
        existing = conn.execute(
            text("SELECT 1 FROM expense_categories WHERE user_id = :uid LIMIT 1"),
            {"uid": uid},
        ).fetchone()
        if existing is None:
            for cat in _LEGACY_DEFAULT_CATEGORIES:
                conn.execute(
                    text(
                        "INSERT INTO expense_categories "
                        "(user_id, name, color, icon, is_default) "
                        "VALUES (:uid, :name, :color, :icon, 1)"
                    ),
                    {
                        "uid": uid,
                        "name": cat["name"],
                        "color": cat["color"],
                        "icon": cat["icon"],
                    },
                )

    super_default = next(
        (c for c in _LEGACY_DEFAULT_CATEGORIES if c["name"] == "Supermercado"),
        None,
    )
    if super_default is None:
        return
    for (uid,) in user_rows:
        has_super = conn.execute(
            text(
                "SELECT 1 FROM expense_categories "
                "WHERE user_id = :uid AND name = :name LIMIT 1"
            ),
            {"uid": uid, "name": super_default["name"]},
        ).fetchone()
        if has_super is None:
            conn.execute(
                text(
                    "INSERT INTO expense_categories "
                    "(user_id, name, color, icon, is_default) "
                    "VALUES (:uid, :name, :color, :icon, 1)"
                ),
                {
                    "uid": uid,
                    "name": super_default["name"],
                    "color": super_default["color"],
                    "icon": super_default["icon"],
                },
            )


def _table_sql(conn, table: str) -> str:
    sql = conn.execute(
        text("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = :name"),
        {"name": table},
    ).scalar()
    return str(sql or "")


def _rebuild_checked_table(
    engine: Engine,
    version: str,
    table: str,
    column_defs: str,
    columns: tuple[str, ...],
) -> None:
    """Rebuild ``table`` so SQLite will accept a CHECK. Copies every row."""
    import logging

    logging.getLogger(__name__).info(
        "rebuilding %s to enforce money checks", table
    )
    raw = engine.raw_connection()
    try:
        cursor = raw.cursor()
        cursor.execute("PRAGMA foreign_keys")
        foreign_keys_on = bool(cursor.fetchone()[0])
        cursor.execute("PRAGMA foreign_keys=OFF")
        cursor.execute("BEGIN")
        try:
            cursor.execute(
                "SELECT sql FROM sqlite_master "
                "WHERE type = 'index' AND tbl_name = ? AND sql IS NOT NULL",
                (table,),
            )
            index_sql = [row[0] for row in cursor.fetchall()]
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            before = cursor.fetchone()[0]
            cursor.execute(f"CREATE TABLE {table}_new ({column_defs})")
            cols = ", ".join(columns)
            cursor.execute(
                f"INSERT INTO {table}_new ({cols}) SELECT {cols} FROM {table}"
            )
            cursor.execute(f"SELECT COUNT(*) FROM {table}_new")
            copied = cursor.fetchone()[0]
            if copied != before:
                raise RuntimeError(
                    f"{table} rebuild did not keep every row ({before} -> {copied})"
                )
            cursor.execute(f"DROP TABLE {table}")
            cursor.execute(f"ALTER TABLE {table}_new RENAME TO {table}")
            for ddl in index_sql:
                cursor.execute(ddl)
            cursor.execute(
                "INSERT INTO schema_migrations (version, applied_at) "
                "VALUES (?, CURRENT_TIMESTAMP)",
                (version,),
            )
            raw.commit()
        except Exception:
            raw.rollback()
            raise
        finally:
            cursor.execute(
                "PRAGMA foreign_keys=ON" if foreign_keys_on else "PRAGMA foreign_keys=OFF"
            )
            cursor.close()
    finally:
        raw.close()


def _ensure_checks(
    engine: Engine,
    version: str,
    table: str,
    markers: tuple[str, ...],
    column_defs: str,
    columns: tuple[str, ...],
) -> None:
    """Record a check step. Rebuild only when the live table lacks a marker."""
    with engine.connect() as conn:
        if _is_applied(conn, version):
            return
        sql = _table_sql(conn, table)
        already = all(marker in sql for marker in markers)
    if already:
        with engine.begin() as conn:
            if not _is_applied(conn, version):
                _mark_applied(conn, version)
        return
    _rebuild_checked_table(engine, version, table, column_defs, columns)


def _apply_money_checks(engine: Engine) -> None:
    """Reject negative money and savings modes outside the API allow-lists.

    ``user_settings.savings_mode`` is percent or fixed.
    ``extra_incomes.savings_mode`` is none, all, percent, or fixed.
    Percents are not amounts. ``monthly_budget`` stays nullable and unchecked.
    """
    _ensure_checks(
        engine,
        "user_settings.nonneg_and_savings_mode",
        "user_settings",
        (
            "CHECK (monthly_income >= 0)",
            "CHECK (savings_amount >= 0)",
            "CHECK (savings_mode IN ('percent', 'fixed'))",
        ),
        "id INTEGER NOT NULL, "
        "user_id INTEGER NOT NULL, "
        "monthly_income NUMERIC(14, 2) NOT NULL CHECK (monthly_income >= 0), "
        "savings_mode VARCHAR(16) NOT NULL "
        "CHECK (savings_mode IN ('percent', 'fixed')), "
        "savings_percent NUMERIC(5, 2) NOT NULL, "
        "savings_amount NUMERIC(14, 2) NOT NULL CHECK (savings_amount >= 0), "
        "dashboard_tour_completed BOOLEAN DEFAULT '0' NOT NULL, "
        "income_check_month VARCHAR(7), "
        "language VARCHAR(5), "
        "weekly_digest_opt_in BOOLEAN DEFAULT '0' NOT NULL, "
        "PRIMARY KEY (id), "
        "UNIQUE (user_id), "
        "FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE",
        (
            "id",
            "user_id",
            "monthly_income",
            "savings_mode",
            "savings_percent",
            "savings_amount",
            "dashboard_tour_completed",
            "income_check_month",
            "language",
            "weekly_digest_opt_in",
        ),
    )
    _ensure_checks(
        engine,
        "fixed_expenses.amount_nonneg",
        "fixed_expenses",
        ("CHECK (amount >= 0)",),
        "id INTEGER NOT NULL, "
        "user_id INTEGER NOT NULL, "
        "name VARCHAR(255) NOT NULL, "
        "amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0), "
        "icon VARCHAR(40), "
        "PRIMARY KEY (id), "
        "FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE",
        ("id", "user_id", "name", "amount", "icon"),
    )
    _ensure_checks(
        engine,
        "variable_expenses.amount_nonneg",
        "variable_expenses",
        ("CHECK (amount >= 0)",),
        "id INTEGER NOT NULL, "
        "user_id INTEGER NOT NULL, "
        "category_id INTEGER, "
        "amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0), "
        "occurred_at DATE NOT NULL, "
        "note TEXT, "
        "created_at DATETIME, "
        "PRIMARY KEY (id), "
        "FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, "
        "FOREIGN KEY(category_id) REFERENCES expense_categories (id) "
        "ON DELETE SET NULL",
        (
            "id",
            "user_id",
            "category_id",
            "amount",
            "occurred_at",
            "note",
            "created_at",
        ),
    )
    _ensure_checks(
        engine,
        "extra_incomes.nonneg_and_savings_mode",
        "extra_incomes",
        (
            "CHECK (amount >= 0)",
            "CHECK (savings_fixed >= 0)",
            "CHECK (savings_mode IN ('none', 'all', 'percent', 'fixed'))",
        ),
        "id INTEGER NOT NULL, "
        "user_id INTEGER NOT NULL, "
        "amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0), "
        "received_at DATE NOT NULL, "
        "savings_mode VARCHAR(16) DEFAULT 'none' NOT NULL "
        "CHECK (savings_mode IN ('none', 'all', 'percent', 'fixed')), "
        "savings_percent NUMERIC(5, 2) DEFAULT '0' NOT NULL, "
        "savings_fixed NUMERIC(14, 2) DEFAULT '0' NOT NULL "
        "CHECK (savings_fixed >= 0), "
        "PRIMARY KEY (id), "
        "FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE",
        (
            "id",
            "user_id",
            "amount",
            "received_at",
            "savings_mode",
            "savings_percent",
            "savings_fixed",
        ),
    )
    _ensure_checks(
        engine,
        "savings_goals.amounts_nonneg",
        "savings_goals",
        (
            "CHECK (target_amount >= 0)",
            "CHECK (current_amount >= 0)",
        ),
        "id INTEGER NOT NULL, "
        "user_id INTEGER NOT NULL, "
        "name VARCHAR(80) NOT NULL, "
        "target_amount NUMERIC(14, 2) NOT NULL CHECK (target_amount >= 0), "
        "current_amount NUMERIC(14, 2) NOT NULL CHECK (current_amount >= 0), "
        "target_date DATE, "
        "PRIMARY KEY (id), "
        "FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE",
        ("id", "user_id", "name", "target_amount", "current_amount", "target_date"),
    )


def _migrate_users_autoincrement(engine: Engine) -> None:
    """Recreate the users table with AUTOINCREMENT so deleted IDs are never reused.

    SQLite INTEGER PRIMARY KEY without AUTOINCREMENT reuses IDs after DELETE.
    When orphaned rows remain in child tables (e.g. user_settings with UNIQUE
    user_id), a new registration can get a reused ID and hit an IntegrityError
    on the settings UNIQUE constraint — misleadingly reported as "email exists".

    This migration creates the table with sqlite_autoincrement=True, which
    guarantees IDs are never reused.
    """
    import logging

    _log = logging.getLogger(__name__)
    version = "users.autoincrement"

    with engine.connect() as check_conn:
        if _is_applied(check_conn, version):
            return
        sql = check_conn.execute(
            text("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'")
        ).scalar()
    if sql and "AUTOINCREMENT" in (sql or ""):
        with engine.begin() as conn:
            if not _is_applied(conn, version):
                _mark_applied(conn, version)
        return

    _log.info("Migrating users table to AUTOINCREMENT…")

    # Use a raw DBAPI connection so we can control PRAGMAs and transactions
    # directly — SQLAlchemy's Connection auto-begins transactions, which
    # conflicts with SQLite's requirement that PRAGMA foreign_keys be set
    # outside any transaction.
    raw = engine.raw_connection()
    try:
        cursor = raw.cursor()
        cursor.execute("PRAGMA foreign_keys=OFF")
        cursor.execute("BEGIN")
        try:
            cursor.execute(
                "CREATE TABLE users_new ("
                "  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,"
                "  email VARCHAR(255) NOT NULL,"
                "  name VARCHAR(80) NOT NULL,"
                "  password_hash VARCHAR(255) NOT NULL,"
                "  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,"
                "  last_login_at DATETIME,"
                "  password_changed_at DATETIME,"
                "  recovery_hash VARCHAR(255),"
                "  must_change_password BOOLEAN DEFAULT '0' NOT NULL"
                ")"
            )
            cursor.execute(
                "INSERT INTO users_new (id, email, name, password_hash,"
                "  created_at, last_login_at, password_changed_at,"
                "  recovery_hash, must_change_password)"
                " SELECT id, email, name, password_hash,"
                "  created_at, last_login_at, password_changed_at,"
                "  recovery_hash, must_change_password FROM users"
            )
            cursor.execute("DROP TABLE users")
            cursor.execute("ALTER TABLE users_new RENAME TO users")
            cursor.execute(
                "CREATE UNIQUE INDEX ix_users_email ON users (email)"
            )
            cursor.execute(
                "INSERT INTO schema_migrations (version, applied_at) "
                "VALUES (?, CURRENT_TIMESTAMP)",
                (version,),
            )
            raw.commit()
            _log.info("users AUTOINCREMENT migration complete")
        except Exception:
            raw.rollback()
            raise
        finally:
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
    finally:
        raw.close()


def _cleanup_orphaned_rows(engine: Engine) -> None:
    """Delete rows in child tables whose parent user no longer exists.

    Safety net for cascading deletes that may have failed (e.g. if
    foreign_keys pragma was off during a manual DELETE).  Without this,
    orphaned user_settings rows with UNIQUE(user_id) can block new
    registrations by occupying IDs that SQLite would reassign.
    """
    import logging

    _log = logging.getLogger(__name__)

    # Tables with user_id FK, ordered so children are cleaned before parents
    _CHILD_TABLES = [
        "push_subscriptions",
        "savings_goals",
        "variable_expenses",
        "extra_incomes",
        "fixed_expenses",
        "expense_categories",
        "user_settings",
    ]

    with engine.begin() as conn:
        conn.execute(text("PRAGMA foreign_keys=ON"))
        for table in _CHILD_TABLES:
            # Only clean tables that exist (some may not be created yet
            # on first run before migrations)
            exists = conn.execute(
                text(
                    "SELECT 1 FROM sqlite_master "
                    "WHERE type='table' AND name=:name"
                ),
                {"name": table},
            ).scalar()
            if not exists:
                continue
            result = conn.execute(
                text(
                    f"DELETE FROM {table} "
                    "WHERE user_id NOT IN (SELECT id FROM users)"
                )
            )
            if result.rowcount:
                _log.warning(
                    "startup integrity: removed %d orphaned rows from %s",
                    result.rowcount,
                    table,
                )


class Base(DeclarativeBase):
    """Base class for every ORM model in the project."""


def apply_sqlite_migrations(engine: Engine) -> None:
    """Apply each SQLite schema step once and record it in ``schema_migrations``.

    A database that already has the current columns gets those historical steps
    marked applied. Their ``ALTER`` / ``CREATE`` statements are not run again.
    """
    if make_url(settings.database_url).get_backend_name() != "sqlite":
        return

    _ensure_schema_migrations(engine)
    _migrate_users_autoincrement(engine)
    _cleanup_orphaned_rows(engine)
    with engine.begin() as conn:
        _apply_historical_steps(conn)
        _backfill_categories(conn)
    _apply_money_checks(engine)


def get_db() -> Generator[Session, None, None]:
    """Yield a Session bound to the current request and close it on exit."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
