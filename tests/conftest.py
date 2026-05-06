"""
Base de datos SQLite en memoria para tests (sin Postgres).
Sustituye `app.database.engine` / `SessionLocal` al importar este conftest;
`app.main` usa `database.engine` para que el lifespan vea el mismo motor.
"""

from collections.abc import Generator
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, delete
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool


def _install_sqlite_engine() -> None:
    import app.database as database
    from app.database import Base

    # Registrar modelos en Base.metadata *antes* de create_all; si no, no se crean tablas.
    import app.models  # noqa: F401

    # :memory: sin pool estático = cada conexión es una BD vacía nueva (no ven las tablas).
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    database.engine = engine
    database.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)


_install_sqlite_engine()

from app.database import SessionLocal  # noqa: E402
from app.models import FixedExpense, UserSettings, VariableExpense  # noqa: E402


@pytest.fixture(autouse=True)
def reset_db() -> Generator[None, None, None]:
    with SessionLocal() as s:
        s.execute(delete(VariableExpense))
        s.execute(delete(FixedExpense))
        s.execute(delete(UserSettings))
        s.commit()
        s.add(UserSettings(id=1, monthly_income=Decimal("0"), savings_percent=Decimal("0")))
        s.commit()
    yield


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        yield session


@pytest.fixture
def client() -> Generator:
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        yield c
