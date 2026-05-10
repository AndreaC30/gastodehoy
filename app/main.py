"""FastAPI bootstrap.

Wires up the lifespan (timezone validation, secret guard, schema bootstrap),
CORS for the Vite dev server, the API routers, and the SPA fallback that
serves the built React app from ``web/dist``.
"""

from contextlib import asynccontextmanager
import logging
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
from app.routers import auth, budget

ROOT = Path(__file__).resolve().parent.parent
DIST_DIR = ROOT / "web" / "dist"
ASSETS_DIR = DIST_DIR / "assets"


DEFAULT_APP_SECRET = "change-me-in-prod"
MIN_APP_SECRET_LEN = 32

_log = logging.getLogger(__name__)


def _require_strong_app_secret(reason: str) -> None:
    if app_settings.app_secret == DEFAULT_APP_SECRET:
        raise RuntimeError(
            f"{reason}: APP_SECRET sigue con el valor por defecto. "
            "Genera uno: APP_SECRET=$(openssl rand -hex 32) y vuélvelo a desplegar."
        )
    if len(app_settings.app_secret) < MIN_APP_SECRET_LEN:
        raise RuntimeError(
            f"{reason}: APP_SECRET demasiado corto ({len(app_settings.app_secret)} < {MIN_APP_SECRET_LEN}). "
            "Usa al menos 32 caracteres aleatorios."
        )


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Startup hook.

    Validates the configured timezone, refuses to start when a strong
    ``APP_SECRET`` is required (``COOKIE_SECURE=true`` or ``ENV=production``),
    and creates any missing tables. ``create_all`` does NOT add new
    columns to existing tables: schema-altering changes still require a
    manual reset (drop the volume in dev).
    """
    try:
        ZoneInfo(app_settings.timezone)
    except ZoneInfoNotFoundError as e:
        raise RuntimeError(
            f"TIMEZONE/TZ inválida: {app_settings.timezone!r}. Usa una IANA válida (p. ej. Europe/Madrid)."
        ) from e

    if app_settings.cookie_secure:
        _require_strong_app_secret("Refusing to start: COOKIE_SECURE=true")

    if app_settings.environment == "production":
        _require_strong_app_secret("Refusing to start: ENV=production")
        if not app_settings.cookie_secure:
            _log.warning(
                "ENV=production pero COOKIE_SECURE=false: la cookie de sesión puede enviarse sin "
                "marcar Secure; usa HTTPS y COOKIE_SECURE=true cuando publiques."
            )

    Base.metadata.create_all(bind=db.engine)
    yield


app = FastAPI(title="GastoDeHoy", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(budget.settings_router)
app.include_router(budget.summary_router)
app.include_router(budget.fixed_router)
app.include_router(budget.expenses_router)
app.include_router(budget.extra_income_router)

if ASSETS_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="vite-assets")


@app.get("/health")
def health() -> JSONResponse:
    """Liveness/readiness probe with a trivial DB round-trip."""
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
    """Serve the built SPA from ``web/dist`` or hint that it must be built."""
    index_path = DIST_DIR / "index.html"
    if not index_path.is_file():
        return JSONResponse(
            status_code=503,
            content={
                "detail": "Frontend not built. Run: cd web && npm install && npm run build",
            },
        )
    return FileResponse(index_path)
