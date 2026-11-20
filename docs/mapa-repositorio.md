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
| `src/components/dashboard/` | Pantalla principal: `dashboard-view.tsx` (contenedor), `daily-hero.tsx` (pantalla Hoy), `day-sheet.tsx` (hoja del día: sugerido, gastado hoy), `pace-meter.tsx` (ritmo del mes con icono y texto), `budget-waterfall.tsx` (del sueldo a la cifra de hoy, solo escritorio), `sidebar-nav.tsx` (lateral y menú Más, en grupos Día a día, Tu mes y Más), `month-history-strip.tsx` (histórico mensual, ahora dentro de Análisis), formularios y modales de gastos, secciones de fijos, categorías, ingresos, metas y paneles de análisis. |
| `src/components/ui/` | Piezas base: `bottom-nav` (cinco botones: Hoy, Gastos, Añadir en el centro, Análisis y Más), `app-sheet`, `app-drawer`, `form-field` (etiqueta visible + ayuda/error enlazados), `form-error`, `swipeable-row`, `empty-state`, `skeleton`, `theme-within`. |
| `src/components/` (raíz) | Landing, login, onboarding, ajustes, aviso legal, `site-footer.tsx` (muestra `v{__APP_VERSION__}`). |
| `src/api/` | `client.ts` (llamadas a `/api/*`) y `types.ts`. |
| `src/lib/` | Utilidades y estado: formato, preferencias, notificaciones, `use-undoable-delete.ts`, `use-dialog-a11y.ts`, `query-keys.ts`. |
| `src/i18n/locales/` | Traducciones. Toda cadena nueva va en los cuatro idiomas. |
| `src/index.css` | Tokens de color (claro en `@theme`, oscuro en `html.dark`) y tipografía. Paleta azul marino con cian. `--color-field-border` es el borde de campos y botones secundarios (3:1); `--color-border` y `--color-border-subtle` son para tarjetas decorativas. |
| `src/lib/ui-a11y.ts` | Constantes de estilo compartidas: `FOCUS_RING`, `INPUT_CLASS`, `BTN_*`, `SECTION_CARD`, `ICON_BTN`. Los campos usan `field-border`. |
| `vite.config.ts` | Inyecta `__APP_VERSION__` desde `package.json`. |
| `scripts/` | `generate-pwa-icons.mjs` y `generate-pwa-splash.mjs` generan iconos y pantallas de lanzamiento; `icons-stable.mjs` los ejecuta y restituye los bytes originales de los PNG cuyos píxeles no cambiaron. |

## Herramientas (`tools/`)

| Fichero | Qué hace |
| --- | --- |
| `check_contrast.py` | Mide los contrastes WCAG de los tokens de `index.css` en claro y oscuro (texto 4,5:1; bordes de campos y foco 3:1). Sale con 1 si algo falla. |
| `check_i18n.py` | Compara `es`, `en`, `fr` y `de`: claves, marcadores `{{x}}` y plurales. Sale con 1 si algo falla. |
| `strip_outer_black_bg.py`, `trim_logo_and_favicon.py` | Retoques puntuales de imágenes de marca. |

## Pruebas y CI

- `pytest` ejecuta `tests/` (unitarias y de API). `tests/e2e/test_account_journey.py` recorre una cuenta completa.
- GitHub Actions (`.github/workflows/tests.yml`) ejecuta en cada push y PR: `pytest`, el e2e, `web-checks` (`tools/check_contrast.py` y `tools/check_i18n.py`) y `web-build` (`npm ci` y `npm run build`).
- `tests/test_openapi_unique_ids.py` vigila que los `operationId` del OpenAPI no se repitan.
- Lo que no se automatiza (móvil real, PWA instalada, lector de pantalla) está en [pruebas-pendientes-en-movil.md](pruebas-pendientes-en-movil.md).

## Ejecutar en local

```bash
uvicorn app.main:app --reload --port 8000   # backend, http://localhost:8000
cd web && npm run dev                       # frontend, http://localhost:5173
python3 -m pytest                           # backend
cd web && npm run build                     # tsc -b + vite build
```

## Cosas que sorprenden

- `npm run build` ejecuta antes `npm run icons` (ahora `scripts/icons-stable.mjs`), que regenera los PNG de `web/public/` y `web/src/assets/`. sharp/libvips puede escribir bytes distintos con los mismos píxeles según su versión; el envoltorio compara los píxeles y restituye el PNG original si no cambió el origen, para que `git status` no se ensucie. Si cambias un origen (`gastodehoy-calendar-icon-source.png`, el logo), el PNG nuevo sí se conserva y debes commitearlo.
- El icono de la app aún muestra "$" y no hay fuente editable para regenerarlo con "€".
- En desarrollo (`ENV=development`) no hay límite de tasa en login ni escrituras. En un servidor público, `ENV=production`.
- El correo necesita SMTP; sin él, el registro funciona pero registra `SMTPNotConfiguredError` al enviar la bienvenida.

## Línea base (20 nov 2026, `develop` en `d553017`)

- `pytest`: 192 pruebas, todas en verde.
- `npm run build`: compila sin errores (`tsc -b` y `vite build`; la PWA precachea 41 entradas).
- `/health` devuelve `{"status":"ok","database":"ok","version":"1.0.0"}`.
- Avisos de la línea base, resueltos en la Fase 6: operation ID duplicado en `sitemap_xml` y `og_image` (`HEAD` ya no entra en el esquema) y aviso de React por `fetchPriority` en `BootSplashContent` (se escribe `fetchpriority`).
