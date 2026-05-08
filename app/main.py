from contextlib import asynccontextmanager
from pathlib import Path

from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app import database as db
from app.config import settings as app_settings
from app.database import Base
from app.routers import (
    auth,
    fixed_expenses,
    settings,
    summary,
    variable_expenses,
)

ROOT = Path(__file__).resolve().parent.parent
DIST_DIR = ROOT / "web" / "dist"
ASSETS_DIR = DIST_DIR / "assets"


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        ZoneInfo(app_settings.timezone)
    except ZoneInfoNotFoundError as e:
        raise RuntimeError(
            f"TIMEZONE/TZ inválida: {app_settings.timezone!r}. Usa una IANA válida (p. ej. Europe/Madrid)."
        ) from e

    Base.metadata.create_all(bind=db.engine)
    yield


app = FastAPI(title="GastoDeHoy", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(summary.router)
app.include_router(settings.router)
app.include_router(fixed_expenses.router)
app.include_router(variable_expenses.router)

if ASSETS_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="vite-assets")


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
def spa_index() -> FileResponse | JSONResponse:
    index_path = DIST_DIR / "index.html"
    if not index_path.is_file():
        return JSONResponse(
            status_code=503,
            content={
                "detail": "Frontend not built. Run: cd web && npm install && npm run build",
            },
        )
    return FileResponse(index_path)
