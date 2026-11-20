# Mapa del repositorio

Guía rápida para orientarse sin releer toda la app. Para decisiones de diseño y arquitectura, ver [arquitectura.md](arquitectura.md).

## Pila

- **Backend:** FastAPI (Python 3.13) + SQLite en `./data/gastodehoy.db`. Sirve también el frontend compilado.
- **Frontend:** React 18 + Vite + Tailwind 4 + TanStack Query + i18next (es, en, fr, de). PWA con service worker (`skipWaiting` y `clientsClaim`).
- **Despliegue:** Docker (`docker-compose*.yml`) detrás de un proxy HTTPS.

## Backend (`app/`)

| Ruta | Qué hay |
| --- | --- |
| `main.py` | Crea la app, monta los routers, `/health` (con `version`), `/csp-report`, manifest, service worker e iconos, y sirve `index.html`. |
| `__init__.py` | `__version__`: debe coincidir con `web/package.json` (lo comprueba `tests/test_version.py`). |
| `config.py` | Ajustes desde variables de entorno. `ENV=development` desactiva los límites de tasa. |
| `database.py` | Conexión SQLite (WAL, `busy_timeout`) y migraciones de esquema. |
| `models.py`, `schemas.py` | Tablas y esquemas Pydantic. |
| `money.py` | Importes en céntimos enteros. |
| `auth.py`, `mail.py`, `api_errors.py`, `error_log.py`, `legal.py` | Sesión y contraseñas, correo (SMTP), errores de API, registro de errores, textos legales. |
| `routers/` | `auth`, `budget` (ajustes, resumen, fijos, gastos, ingresos extra), `budget_rules`, `categories` (y `insights`), `goals`, `export`, `push`, `admin`. |
| `services/` | Lógica de cálculo: `budget`, `rule_503020`, `insights`, `history`, `extra_income_savings`, `weekly_digest`, `web_push`, `notification_message`. |
| `cli/` | Tareas por línea de comandos: `backup`, `check_backup`, `reset_password`, `send_daily_push`, `send_weekly_digests`. |

## Frontend (`web/`)

| Ruta | Qué hay |
| --- | --- |
| `src/App.tsx`, `main.tsx` | Arranque, proveedores y decisión landing / login / dashboard. |
| `src/components/dashboard/` | Pantalla principal: `dashboard-view.tsx` (contenedor), `daily-hero.tsx` (cifra de hoy), `sidebar-nav.tsx`, formularios y modales de gastos, secciones de fijos, categorías, ingresos, metas, paneles de análisis. |
| `src/components/ui/` | Piezas base: `bottom-nav`, `app-sheet`, `app-drawer`, `form-field`, `swipeable-row`, `empty-state`, `skeleton`. |
| `src/components/` (raíz) | Landing, login, onboarding, ajustes, aviso legal, `site-footer.tsx` (muestra `v{__APP_VERSION__}`). |
| `src/api/` | `client.ts` (llamadas a `/api/*`) y `types.ts`. |
| `src/lib/` | Utilidades y estado: formato, preferencias, notificaciones, `use-undoable-delete.ts`, `use-dialog-a11y.ts`, `query-keys.ts`. |
| `src/i18n/locales/` | Traducciones. Toda cadena nueva va en los cuatro idiomas. |
| `src/index.css` | Variables de color y tipografía (base del rediseño visual). |
| `vite.config.ts` | Inyecta `__APP_VERSION__` desde `package.json`. |
| `scripts/` | Generan los iconos y las pantallas de lanzamiento de la PWA. |

## Pruebas y CI

- `pytest` ejecuta `tests/` (unitarias y de API). `tests/e2e/test_account_journey.py` recorre una cuenta completa.
- GitHub Actions (`.github/workflows`) ejecuta `pytest` y el e2e en cada push y PR. **No ejecuta `npm run build`**, así que un error de tipos del frontend no rompe la comprobación automática.

## Ejecutar en local

```bash
uvicorn app.main:app --reload --port 8000   # backend, http://localhost:8000
cd web && npm run dev                       # frontend, http://localhost:5173
python3 -m pytest                           # backend
cd web && npm run build                     # tsc -b + vite build
```

## Cosas que sorprenden

- `npm run build` ejecuta antes `npm run icons`, que **regenera los PNG** de `web/public/` y `web/src/assets/` (iconos y pantallas de lanzamiento). Tras compilar, `git status` los muestra modificados aunque no se haya tocado nada: no se commitean salvo que el cambio sea intencionado.
- El icono de la app aún muestra "$" y no hay fuente editable para regenerarlo con "€".
- En desarrollo (`ENV=development`) no hay límite de tasa en login ni escrituras. En un servidor público, `ENV=production`.
- El correo necesita SMTP; sin él, el registro funciona pero registra `SMTPNotConfiguredError` al enviar la bienvenida.

## Línea base (20 nov 2026, `develop` en `d553017`)

- `pytest`: 192 pruebas, todas en verde.
- `npm run build`: compila sin errores (`tsc -b` y `vite build`; la PWA precachea 41 entradas).
- `/health` devuelve `{"status":"ok","database":"ok","version":"1.0.0"}`.
- Aviso conocido de FastAPI: operation ID duplicado en `sitemap_xml` y `og_image` (rutas `HEAD`).
- Aviso de React en consola: `fetchPriority` en `BootSplashContent` (`boot-splash-content.tsx`); debe ser `fetchpriority` en React 18.
