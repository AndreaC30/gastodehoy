# GastoDeHoy

Web: te dice **cuánto puedes gastar hoy** para no quedarte sin margen a fin de mes.

**Stack:** FastAPI + PostgreSQL · React + Vite + Tailwind v4 · TanStack Query · auth con cookie HttpOnly + bcrypt · tests con pytest (SQLite en memoria) · HTTPS opcional con Caddy.

## Cómo arrancar (Docker, sin HTTPS)

```bash
cp .env.example .env
docker compose up --build -d
```

Abre `http://localhost:8000`. Cuentas: **crea una** desde la pantalla inicial (email + nombre + contraseña).

Salud: `GET /health`.

### Si no arranca

```bash
docker compose ps
docker compose logs --tail=150 app
docker compose logs --tail=50 db
```

## Producción con HTTPS (Caddy + Let's Encrypt)

Ten un dominio que apunte a la IP pública del servidor y los puertos `80` y `443` accesibles. En el servidor:

```bash
git clone … && cd gastodehoy
cp .env.example .env
# Edita .env y deja al menos:
#   SITE_DOMAIN=gastos.tudominio.com
#   ACME_EMAIL=tu-email@ejemplo.com
#   APP_SECRET=$(openssl rand -hex 32)
#   COOKIE_SECURE=true
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Caddy pide y renueva el certificado solo. La app (`app`) y la base (`db`) no exponen puertos; solo Caddy escucha en 80/443.

> Si **cambias `APP_SECRET`** después, todas las sesiones existentes se invalidan y cada cuenta vuelve a iniciar sesión.

## Desarrollo local

Postgres en Docker; uvicorn y Vite en tu máquina:

```bash
docker compose up -d db
cp .env.example .env

python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt requirements-dev.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# en otra terminal
cd web && npm install && npm run dev
```

Abre `http://localhost:5173`. Si tienes el `8000` ocupado por el contenedor `app`, párenlo (`docker compose stop app`) o lanza uvicorn en `--port 8001` y crea `web/.env` con `VITE_API_PROXY_TARGET=http://127.0.0.1:8001`.

Build de producción del front (lo hace también el `Dockerfile`):

```bash
cd web && npm install && npm run build
```

## Cuenta y seguridad

- Login con **email + contraseña**, contraseña con **bcrypt** (sin texto plano en BD).
- Sesión por cookie firmada **`HttpOnly; SameSite=Lax`**; `Secure` se activa solo en producción (`COOKIE_SECURE=true`).
- **Refusal-to-start** si `COOKIE_SECURE=true` con `APP_SECRET` por defecto o más corto de 32 caracteres.
- Rate limit en `/api/auth/login` y `/api/auth/recover`: 5 intentos por IP cada 5 minutos → `429`.
- **Cambio o reset de contraseña invalida sesiones previas** (`password_changed_at` + comprobación al decodificar la cookie). Tras cambio o reset el usuario debe volver a entrar.
- Cada cuenta solo ve sus datos; los IDs de otras cuentas devuelven `404`.
- Cabeceras de hardening en Caddy: HSTS, CSP, `X-Content-Type-Options`, `X-Frame-Options=DENY`, `Referrer-Policy`, `Permissions-Policy`, sin cabecera `Server`.

### Recuperación de contraseña

- Al registrarte la app te muestra **una sola vez** un código tipo `gdh-xxxx-xxxx-xxxx-xxxx`. Guárdalo en tu gestor de contraseñas o en papel; en BD se almacena solo su hash bcrypt.
- Si olvidas tu contraseña, en la pantalla de login tienes **He olvidado mi contraseña**: pides email + código y eliges una nueva. El código es de **un solo uso**: al usarlo se te entrega uno nuevo.
- Si pierdes a la vez la contraseña y el código, el admin puede resetearlo desde el host:

```bash
./scripts/reset-password.sh user@example.com
```

El script pide la nueva contraseña por terminal (oculta), invalida sesiones previas y genera un código de recuperación nuevo que se imprime una vez. Si la app corre en docker, el script lo detecta y ejecuta dentro del contenedor.

### Backups de la base de datos

```bash
./scripts/backup.sh             # vuelca a ./backups/, rota a 7 días
KEEP_DAYS=14 ./scripts/backup.sh
```

Cron diario a las 3:30 (en el servidor):

```cron
30 3 * * * cd /opt/gastodehoy && ./scripts/backup.sh >> /var/log/gastodehoy-backup.log 2>&1
```

Restaurar un dump:

```bash
gunzip -c backups/gastodehoy-YYYYMMDDTHHMMSSZ.sql.gz \
  | docker compose exec -T db psql -U gastodehoy -d gastodehoy
```

## Pruebas

```bash
pip install -r requirements-dev.txt
pytest
```

Solo API + lógica; el front no se ejecuta.

## Versiones

- Python 3.13+, Postgres 18, Node 22 (build), Tailwind v4.
- Volumen de Postgres montado en **`/var/lib/postgresql`** (Postgres 18+).

## Regla de cálculo

`(ingreso mensual − ahorro − gastos fijos − gastos variables del mes) ÷ días que quedan en el mes calendario`

`TIMEZONE` por defecto `Europe/Madrid`.
