"""SQLite in-memory para tests; sustituye `app.database.engine` antes del lifespan."""

import os

# Set env vars BEFORE importing anything that uses pydantic-settings
os.environ["ENV"] = "development"
os.environ["COOKIE_SECURE"] = "false"
os.environ.pop("COOKIE_DOMAIN", None)
os.environ["APP_SECRET"] = "test-secret-key-for-tests-only-12345678"

from collections.abc import Generator

import pytest
from sqlalchemy import create_engine, delete
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool


def _install_sqlite_engine() -> None:
    import app.database as database
    from app.database import Base

    import app.models  # noqa: F401

    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    database.engine = engine
    database.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)


_install_sqlite_engine()

# Now import app modules (after env is set and engine is installed)
from app.auth import hash_password  # noqa: E402
from app.config import settings  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.models import (  # noqa: E402
    ExpenseCategory,
    ExtraIncome,
    FixedExpense,
    LoginAttempt,
    User,
    UserSettings,
    VariableExpense,
)

# Ensure cookie domain is None for tests (TestClient can't handle domain cookies)
settings.cookie_domain = None


@pytest.fixture(autouse=True)
def reset_db() -> Generator[None, None, None]:
    with SessionLocal() as s:
        s.execute(delete(VariableExpense))
        s.execute(delete(ExtraIncome))
        s.execute(delete(FixedExpense))
        s.execute(delete(ExpenseCategory))
        s.execute(delete(UserSettings))
        s.execute(delete(User))
        s.execute(delete(LoginAttempt))
        s.commit()
    yield


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        yield session


def _make_user(
    session: Session,
    email: str = "test@example.com",
    name: str = "Test",
    password: str = "secret-password",
) -> User:
    user = User(
        email=email.lower(),
        name=name,
        password_hash=hash_password(password),
    )
    user.settings = UserSettings()
    session.add(user)
    session.commit()
    session.refresh(user)
    # Seed default categories for the user
    from app.services.categories import seed_default_categories
    seed_default_categories(session, user.id)
    return user


@pytest.fixture
def user(db_session: Session) -> User:
    return _make_user(db_session)


@pytest.fixture
def client(user: User) -> Generator:
    from fastapi.testclient import TestClient

    from app.auth import SESSION_COOKIE, make_session_token
    from app.main import app

    with TestClient(app, headers={"X-Requested-With": "XMLHttpRequest"}) as c:
        c.cookies.set(SESSION_COOKIE, make_session_token(user.id))
        yield c


@pytest.fixture
def anon_client() -> Generator:
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app, headers={"X-Requested-With": "XMLHttpRequest"}) as c:
        yield c
