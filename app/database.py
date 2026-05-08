"""SQLAlchemy engine, session factory and declarative ``Base``.

``get_db`` is the FastAPI dependency that gives a request-scoped session
and guarantees it gets closed.
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class for every ORM model in the project."""


def get_db() -> Generator[Session, None, None]:
    """Yield a Session bound to the current request and close it on exit."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
