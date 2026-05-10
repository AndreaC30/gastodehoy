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
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class for every ORM model in the project."""


def apply_sqlite_migrations(engine: Engine) -> None:
    """Añade columnas nuevas en SQLite sin Alembic (BBDD ya existentes)."""
    if make_url(settings.database_url).get_backend_name() != "sqlite":
        return
    with engine.begin() as conn:
        rows = conn.execute(text("PRAGMA table_info(users)")).fetchall()
        colnames = {str(r[1]) for r in rows}
        if "must_change_password" not in colnames:
            conn.execute(
                text(
                    "ALTER TABLE users ADD COLUMN must_change_password "
                    "BOOLEAN NOT NULL DEFAULT 0"
                )
            )


def get_db() -> Generator[Session, None, None]:
    """Yield a Session bound to the current request and close it on exit."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
