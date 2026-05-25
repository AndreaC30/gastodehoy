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


class Base(DeclarativeBase):
    """Base class for every ORM model in the project."""


def apply_sqlite_migrations(engine: Engine) -> None:
    """Anade columnas nuevas e indices en SQLite sin Alembic (BBDD ya existentes)."""
    if make_url(settings.database_url).get_backend_name() != "sqlite":
        return
    with engine.begin() as conn:
        # Migraciones de columnas
        rows = conn.execute(text("PRAGMA table_info(users)")).fetchall()
        colnames = {str(r[1]) for r in rows}
        if "must_change_password" not in colnames:
            conn.execute(
                text(
                    "ALTER TABLE users ADD COLUMN must_change_password "
                    "BOOLEAN NOT NULL DEFAULT 0"
                )
            )

        # Nueva tabla: expense_categories
        conn.execute(
            text(
                "CREATE TABLE IF NOT EXISTS expense_categories ("
                "  id INTEGER PRIMARY KEY AUTOINCREMENT,"
                "  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,"
                "  name VARCHAR(80) NOT NULL,"
                "  color VARCHAR(7) NOT NULL DEFAULT '#6366f1',"
                "  icon VARCHAR(40),"
                "  is_default BOOLEAN NOT NULL DEFAULT 0"
                ")"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_expense_categories_user "
                "ON expense_categories(user_id)"
            )
        )

        # Nueva columna: category_id en variable_expenses
        ve_rows = conn.execute(text("PRAGMA table_info(variable_expenses)")).fetchall()
        ve_colnames = {str(r[1]) for r in ve_rows}
        if "category_id" not in ve_colnames:
            conn.execute(
                text(
                    "ALTER TABLE variable_expenses ADD COLUMN category_id "
                    "INTEGER REFERENCES expense_categories(id) ON DELETE SET NULL"
                )
            )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_variable_expenses_category "
                "ON variable_expenses(category_id)"
            )
        )

        # Seed default categories for existing users that have none
        from app.services.categories import DEFAULT_CATEGORIES
        user_rows = conn.execute(text("SELECT id FROM users")).fetchall()
        for (uid,) in user_rows:
            existing = conn.execute(
                text("SELECT 1 FROM expense_categories WHERE user_id = :uid LIMIT 1"),
                {"uid": uid},
            ).fetchone()
            if existing is None:
                for cat in DEFAULT_CATEGORIES:
                    conn.execute(
                        text(
                            "INSERT INTO expense_categories (user_id, name, color, icon, is_default) "
                            "VALUES (:uid, :name, :color, :icon, 1)"
                        ),
                        {"uid": uid, "name": cat["name"], "color": cat["color"], "icon": cat["icon"]},
                    )

        # Indices para consultas de rango por fecha (dashboard)
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_variable_expenses_user_date "
                "ON variable_expenses(user_id, occurred_at)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_extra_incomes_user_date "
                "ON extra_incomes(user_id, received_at)"
            )
        )

        ei_rows = conn.execute(text("PRAGMA table_info(extra_incomes)")).fetchall()
        ei_colnames = {str(r[1]) for r in ei_rows}
        if "savings_mode" not in ei_colnames:
            conn.execute(
                text(
                    "ALTER TABLE extra_incomes ADD COLUMN savings_mode "
                    "VARCHAR(16) NOT NULL DEFAULT 'none'"
                )
            )
        if "savings_percent" not in ei_colnames:
            conn.execute(
                text(
                    "ALTER TABLE extra_incomes ADD COLUMN savings_percent "
                    "NUMERIC(5, 2) NOT NULL DEFAULT 0"
                )
            )
        if "savings_fixed" not in ei_colnames:
            conn.execute(
                text(
                    "ALTER TABLE extra_incomes ADD COLUMN savings_fixed "
                    "NUMERIC(14, 2) NOT NULL DEFAULT 0"
                )
            )

        cat_rows = conn.execute(text("PRAGMA table_info(expense_categories)")).fetchall()
        cat_colnames = {str(r[1]) for r in cat_rows}
        if "monthly_budget" not in cat_colnames:
            conn.execute(
                text(
                    "ALTER TABLE expense_categories ADD COLUMN monthly_budget "
                    "NUMERIC(14, 2)"
                )
            )

        fe_rows = conn.execute(text("PRAGMA table_info(fixed_expenses)")).fetchall()
        fe_colnames = {str(r[1]) for r in fe_rows}
        if "icon" not in fe_colnames:
            conn.execute(
                text("ALTER TABLE fixed_expenses ADD COLUMN icon VARCHAR(40)")
            )

        conn.execute(
            text(
                "CREATE TABLE IF NOT EXISTS savings_goals ("
                "  id INTEGER PRIMARY KEY AUTOINCREMENT,"
                "  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,"
                "  name VARCHAR(80) NOT NULL,"
                "  target_amount NUMERIC(14, 2) NOT NULL,"
                "  current_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,"
                "  target_date DATE"
                ")"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_savings_goals_user "
                "ON savings_goals(user_id)"
            )
        )

        # Supermercado: usuarios ya registrados (sin tocar el resto de categorías ni gastos).
        # Solo INSERT si no existe ese nombre; nuevos usuarios ya la reciben vía DEFAULT_CATEGORIES.
        super_default = next(
            (c for c in DEFAULT_CATEGORIES if c["name"] == "Supermercado"),
            None,
        )
        if super_default is not None:
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


def get_db() -> Generator[Session, None, None]:
    """Yield a Session bound to the current request and close it on exit."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
