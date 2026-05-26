"""FastAPI bootstrap.

Wires up the lifespan (timezone validation, secret guard, schema bootstrap),
CORS for the Vite dev server, the API routers, and the SPA fallback that
serves the built React app from ``web/dist``.
"""

from contextlib import asynccontextmanager
import logging
import uuid
from pathlib import Path

from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

_log = logging.getLogger(__name__)

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi import status
from sqlalchemy import text

from app import database as db
from app.config import settings as app_settings
from app.database import Base
from app.routers import auth, budget, budget_rules, categories, export, goals, push

ROOT = Path(__file__).resolve().parent.parent
DIST_DIR = ROOT / "web" / "dist"
ASSETS_DIR = DIST_DIR / "assets"

# Copied from web/public (and sitemap.xml rewritten at build) — not under /assets.
# PWA artifacts are emitted at web/dist root by vite-plugin-pwa on build.
DIST_ROOT_STATIC_FILES: dict[str, str] = {
    "robots.txt": "text/plain; charset=utf-8",
    "sitemap.xml": "application/xml",
    "og-image.png": "image/png",
    "manifest.webmanifest": "application/manifest+json",
    "sw.js": "application/javascript; charset=utf-8",
    "registerSW.js": "application/javascript; charset=utf-8",
    "gastodehoy-favicon-192.png": "image/png",
    "gastodehoy-app-icon.png": "image/png",
    "gastodehoy-apple-touch-180.png": "image/png",
    "gastodehoy-app-icon-maskable.png": "image/png",
}


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
    and creates any missing tables. Para SQLite se aplican migraciones
    ligeras (p. ej. columnas nuevas) tras ``create_all``.
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
    db.apply_sqlite_migrations(db.engine)
    yield


app = FastAPI(title="GastoDeHoy", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Attach a unique request_id to every request for log correlation."""
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


@app.middleware("http")
async def csrf_protection(request: Request, call_next):
    """Middleware para protección CSRF en rutas API.

    Verifica que requests a /api/ con cookie de sesion incluyan el header
    X-Requested-With con valor XMLHttpRequest.

    Excepciones: GET, HEAD, OPTIONS, /health, y requests sin cookie de sesion.
    Solo aplica en produccion (no en development).
    """
    # No aplicar en development (tests, desarrollo local)
    if app_settings.environment != "production":
        return await call_next(request)

    # Permitir métodos seguros sin verificacion CSRF
    if request.url.path == "/health" or request.method in ("GET", "HEAD", "OPTIONS"):
        return await call_next(request)

    # Solo verificar en rutas API con cookie de sesion
    if request.url.path.startswith("/api/"):
        session_cookie = request.cookies.get("gdh_session")
        if session_cookie:
            requested_with = request.headers.get("X-Requested-With")
            if requested_with != "XMLHttpRequest":
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"detail": "CSRF validation failed"},
                )

    return await call_next(request)

app.include_router(auth.router)
app.include_router(budget.settings_router)
app.include_router(budget.summary_router)
app.include_router(budget.fixed_router)
app.include_router(budget.expenses_router)
app.include_router(budget.extra_income_router)
app.include_router(budget_rules.router)
app.include_router(export.router)
app.include_router(categories.categories_router)
app.include_router(categories.insights_router)
app.include_router(goals.router)
app.include_router(push.router)

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


@app.post("/csp-report")
async def csp_report(request: Request):
    """Receive CSP violation reports from browsers (logging only)."""
    try:
        body = await request.json()
        _log.warning("CSP violation: %s", body)
    except Exception:
        pass
    return Response(status_code=204)


def _dist_root_file(name: str, media_type: str) -> FileResponse | JSONResponse:
    """Serve a file from ``web/dist`` root (SEO / public), with path traversal blocked."""
    dist_root = DIST_DIR.resolve()
    path = (DIST_DIR / name).resolve()
    if not path.is_file() or path.parent != dist_root:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": "Not Found"},
        )
    return FileResponse(path, media_type=media_type)


@app.get("/robots.txt", response_model=None)
def robots_txt() -> FileResponse | JSONResponse:
    return _dist_root_file("robots.txt", DIST_ROOT_STATIC_FILES["robots.txt"])


@app.get("/sitemap.xml", response_model=None)
def sitemap_xml() -> FileResponse | JSONResponse:
    return _dist_root_file("sitemap.xml", DIST_ROOT_STATIC_FILES["sitemap.xml"])


@app.get("/og-image.png", response_model=None)
def og_image() -> FileResponse | JSONResponse:
    return _dist_root_file("og-image.png", DIST_ROOT_STATIC_FILES["og-image.png"])


@app.get("/manifest.webmanifest", response_model=None)
def pwa_manifest() -> FileResponse | JSONResponse:
    return _dist_root_file(
        "manifest.webmanifest", DIST_ROOT_STATIC_FILES["manifest.webmanifest"]
    )


@app.get("/sw.js", response_model=None)
def pwa_service_worker() -> FileResponse | JSONResponse:
    return _dist_root_file("sw.js", DIST_ROOT_STATIC_FILES["sw.js"])


@app.get("/registerSW.js", response_model=None)
def pwa_register_sw() -> FileResponse | JSONResponse:
    return _dist_root_file("registerSW.js", DIST_ROOT_STATIC_FILES["registerSW.js"])


@app.get("/gastodehoy-favicon-192.png", response_model=None)
def pwa_icon_192() -> FileResponse | JSONResponse:
    return _dist_root_file(
        "gastodehoy-favicon-192.png", DIST_ROOT_STATIC_FILES["gastodehoy-favicon-192.png"]
    )


@app.get("/gastodehoy-app-icon.png", response_model=None)
def pwa_icon_512() -> FileResponse | JSONResponse:
    return _dist_root_file(
        "gastodehoy-app-icon.png", DIST_ROOT_STATIC_FILES["gastodehoy-app-icon.png"]
    )


@app.get("/gastodehoy-apple-touch-180.png", response_model=None)
def pwa_apple_touch_icon() -> FileResponse | JSONResponse:
    return _dist_root_file(
        "gastodehoy-apple-touch-180.png",
        DIST_ROOT_STATIC_FILES["gastodehoy-apple-touch-180.png"],
    )


@app.get("/gastodehoy-app-icon-maskable.png", response_model=None)
def pwa_icon_maskable() -> FileResponse | JSONResponse:
    return _dist_root_file(
        "gastodehoy-app-icon-maskable.png",
        DIST_ROOT_STATIC_FILES["gastodehoy-app-icon-maskable.png"],
    )


@app.get("/workbox-{asset_hash}.js", response_model=None)
def pwa_workbox_bundle(asset_hash: str) -> FileResponse | JSONResponse:
    """Serve hashed Workbox runtime generated by vite-plugin-pwa."""
    if not asset_hash.isalnum():
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": "Not Found"},
        )
    return _dist_root_file(
        f"workbox-{asset_hash}.js",
        "application/javascript; charset=utf-8",
    )


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
    # El HTML debe revalidarse: los JS/CSS llevan hash en nombre; si el HTML cachea en
    # cliente, la producción muestra bundles viejos aunque la imagen esté actualizada.
    return FileResponse(
        index_path,
        headers={
            "Cache-Control": "no-cache",
        },
    )
