# Arquitectura

Documento interno para quien entra al código. No se publica en el sitio: no hay ruta ni enlace en la SPA.

El registro de tratamientos está en [registro-tratamientos.md](registro-tratamientos.md). La recuperación de producción está en [recuperacion.md](recuperacion.md).

## Cómo está partida la aplicación

El backend es FastAPI en `app/`. Los routers de `app/routers/` exponen la API bajo `/api/` (cuenta, presupuesto, gastos, categorías, metas, exportación, avisos push y administración). La lógica de presupuesto y avisos está en `app/services/`. La configuración se lee del entorno en `app/config.py`.

El frontend es la aplicación React con Vite en `web/`. En local, el script `dev` de `web/package.json` arranca Vite. El CORS de desarrollo acepta por defecto `http://127.0.0.1:5173` y `http://localhost:5173`.

En ejecución hay un solo proceso. La imagen construye `web/` con `npm run build` y copia `web/dist` junto a `app/`. El contenedor arranca `uvicorn app.main:app` en el puerto 8000. Ese proceso sirve la API y los archivos de `web/dist`: `/` y `/reset-password` devuelven `index.html`, `/assets` los bundles, y el resto de rutas estáticas de la PWA los archivos de la raíz de `web/dist`. Si falta `web/dist/index.html`, `/` responde que hay que construir el frontend con `cd web && npm install && npm run build`.

Los datos son SQLite. La URL por defecto es `sqlite:///./data/gastodehoy.db` (`DATABASE_URL`). En Docker el archivo es `/app/data/gastodehoy.db`.

## Tablas y cambios de esquema

Los modelos ORM están en `app/models.py`. Una fila de `users` posee el resto de datos de esa cuenta; las relaciones borran en cascada al eliminar el usuario. `revoked_sessions` y `login_attempts` no cuelgan de esa relación.

Tablas:

- `users` — cuenta: email, nombre, hash de la contraseña, código y enlace de recuperación, condiciones aceptadas.
- `user_settings` — ingreso mensual, regla de ahorro, idioma y opciones de la cuenta.
- `fixed_expenses` — gastos que se repiten cada mes.
- `variable_expenses` — gastos con fecha, nota y categoría opcional.
- `expense_categories` — categorías de esos gastos, con color, icono y tope mensual opcional.
- `extra_incomes` — ingresos puntuales, con fecha y regla de ahorro propia.
- `savings_goals` — metas con importe objetivo, importe acumulado y fecha opcional.
- `push_subscriptions` — una suscripción Web Push por dispositivo.
- `revoked_sessions` — identificador de sesión invalidado al cerrar sesión.
- `login_attempts` — intentos de acceso, para el límite por IP y por email.

No hay Alembic. Al arrancar, el lifespan de `app/main.py` llama a `Base.metadata.create_all` y después a `apply_sqlite_migrations` en `app/database.py`. Esa función solo actúa si el motor es SQLite. `create_all` crea las tablas que faltan a partir de los modelos; no reescribe una base que ya existe.

`apply_sqlite_migrations` crea, si no existe, `schema_migrations` (`version` TEXT como clave primaria, `applied_at`). Esa tabla no es un modelo de `app/models.py`: es el libro de los pasos ya aplicados. Cada paso de esquema tiene un id estable en `SCHEMA_MIGRATION_IDS`. `_add_column`, `_ensure_table`, `_ensure_index` y `_ensure_checks` no vuelven a ejecutar el DDL si el id ya está anotado. Si la columna, la tabla, el índice o el `CHECK` ya están, solo anotan el id. Esos pasos históricos se aplican en `_apply_historical_steps`, más `_migrate_users_autoincrement` (recrea `users` con `AUTOINCREMENT`) y `_apply_money_checks`.

En el mismo arranque hay dos pasos que no son un cambio de esquema anotado: `_cleanup_orphaned_rows` borra filas hijas cuyo usuario ya no existe, y `_backfill_categories` rellena categorías por defecto y se puede repetir. `_migrate_money_to_integer_cents` pasa los importes antiguos a céntimos enteros; no escribe en `schema_migrations`. La segunda vez ve columnas `INTEGER` y se detiene.

Un cambio de esquema nuevo es otra función en `app/database.py`, llamada desde `apply_sqlite_migrations`, con un id nuevo en `SCHEMA_MIGRATION_IDS`. Al aplicarse queda una fila en `schema_migrations`. Volver a un commit anterior no deshace esos pasos.

El dinero se guarda en céntimos enteros. `app/money.py` define el tipo `Cents`: en SQLite la columna es `INTEGER`; en Python el atributo es un `Decimal` en euros con dos decimales (`euros_to_cents` al escribir, `cents_to_euros` al leer). La API usa ese mismo decimal en euros. Las columnas son `user_settings.monthly_income` y `savings_amount`, `fixed_expenses.amount`, `variable_expenses.amount`, `expense_categories.monthly_budget`, `extra_incomes.amount` y `savings_fixed`, y `savings_goals.target_amount` y `current_amount`. Los porcentajes (`user_settings.savings_percent`, `extra_incomes.savings_percent`) siguen siendo `Numeric(5, 2)`.

## Cómo se ejecutan las pruebas

`pytest.ini` fija `testpaths = tests`, `pythonpath = .` y `addopts = -q`. Con eso, `pytest` recoge `tests/` (incluido `tests/e2e`) y corre en silencio salvo fallos.

`.github/workflows/tests.yml` se dispara en `push` y en `pull_request`. Los dos jobs usan `ubuntu-latest` y Python 3.13, e instalan con:

```bash
pip install -r requirements.txt -r requirements-dev.txt
```

El job `pytest` ejecuta:

```bash
pytest
```

El job `e2e` es aparte y ejecuta solo el recorrido de cuenta:

```bash
pytest tests/e2e/test_account_journey.py
```

En local son esos mismos comandos, desde la raíz del repositorio.
