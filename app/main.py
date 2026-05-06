from contextlib import asynccontextmanager
from pathlib import Path

from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import database as db
from app.config import settings as app_settings
from app.database import Base
from app.models import UserSettings
from app.routers import fixed_expenses, settings, summary, variable_expenses


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        ZoneInfo(app_settings.timezone)
    except ZoneInfoNotFoundError as e:
        raise RuntimeError(
            f"TIMEZONE/TZ inválida: {app_settings.timezone!r}. Usa una IANA válida (p. ej. Europe/Madrid)."
        ) from e

    Base.metadata.create_all(bind=db.engine)

    with Session(db.engine) as session:
        if session.get(UserSettings, 1) is None:
            session.add(UserSettings(id=1))
            try:
                session.commit()
            except IntegrityError:
                session.rollback()
    yield


app = FastAPI(title="GastoDeHoy", lifespan=lifespan)

app.include_router(summary.router)
app.include_router(settings.router)
app.include_router(fixed_expenses.router)
app.include_router(variable_expenses.router)

_static_dir = Path(__file__).resolve().parent.parent / "static"
if _static_dir.is_dir():
    app.mount("/assets", StaticFiles(directory=_static_dir), name="assets")


@app.get("/health")
def health() -> JSONResponse:
    try:
        with db.SessionLocal() as session:
            session.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"status": "degraded", "database": "unreachable"},
        )
    return JSONResponse(content={"status": "ok", "database": "ok"})


@app.get("/", response_model=None)
def index() -> FileResponse | JSONResponse:
    index_path = _static_dir / "index.html"
    if not index_path.is_file():
        return JSONResponse(
            status_code=500,
            content={"detail": "Falta static/index.html"},
        )
    return FileResponse(index_path)
