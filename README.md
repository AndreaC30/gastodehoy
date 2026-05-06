# GastoDeHoy

Web: te dice **cuánto puedes gastar hoy** para no quedarte sin margen a fin de mes.

**Stack:** FastAPI + PostgreSQL · frontend **React + Vite + Tailwind CSS v4** · datos con **TanStack Query** · tests **pytest** (SQLite en memoria).

## Cómo arrancar (Docker)

En la raíz del repo (la imagen **construye** el frontend con Node y copia `web/dist`):

```bash
docker compose up --build -d
```

Abre `http://localhost:8000` (misma API y mismo origen: sin CORS en producción).

Salud: `GET /health` — `200` con `database: ok` si Postgres responde; si no, `503`.

### Si no arranca (logs)

```bash
docker compose ps
docker compose logs --tail=150 web
docker compose logs --tail=50 db
```

## Desarrollo local (recomendado)

**Base de datos:** el `docker-compose` publica Postgres en **`localhost:5432`**. Para desarrollo con `uvicorn` en tu Mac, deja solo la base arriba:

```bash
docker compose up -d db
```

Copia `.env.example` a `.env` (mismo usuario/clave que en el compose). Si el puerto **8000** lo ocupa el contenedor `web`, para la API en local usa otro puerto, p. ej. **8001**, y ajusta el proxy de Vite (ver abajo).

**Dos terminales** — API y Vite:

1. **Backend** (Python 3.13+, con `.env` apuntando a `localhost:5432`):

   ```bash
   python -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env   # la primera vez
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

   Si `8000` está en uso: `uvicorn` con `--port 8001` y en `web/` crea `.env` con  
   `VITE_API_PROXY_TARGET=http://127.0.0.1:8001` (ver `web/.env.example`) para que `npm run dev` enrute bien la API.

2. **Frontend** (`/api` y `/health` van por proxy a FastAPI; CORS ya permitido para `:5173`):

   ```bash
   cd web
   npm install
   npm run dev
   ```

Abre **`http://localhost:5173`**. Si intentas solo `http://localhost:8000` sin haber hecho `npm run build`, verás un JSON indicando que falta el build del frontend.

Build de producción local:

```bash
cd web && npm install && npm run build
```

Tras eso, `uvicorn` puede servir el SPA desde `web/dist` en el puerto 8000.

## Versiones y mantenimiento

- **Python:** 3.13+ (ver Dockerfile).
- **PostgreSQL:** `postgres:18-alpine`, volumen en **`/var/lib/postgresql`**. Cambio de major: migración o volumen nuevo (en dev: `docker compose down -v` con cuidado).
- **Node:** ver `web/package.json` (imagen Docker usa Node 22 para el build).

```bash
docker compose build --pull
docker compose up -d
```

## Pruebas automatizadas

```bash
pip install -r requirements-dev.txt
pytest
```

Solo API/base de datos de test (SQLite); **no** ejecutan el frontend.

## Despliegue en tu servidor

1. `git pull`
2. `docker compose up --build -d`

## Regla de cálculo (MVP)

`(ingreso mensual − ahorro − gastos fijos − gastos variables del mes) ÷ días que quedan en el mes calendario`

`TIMEZONE` por defecto `Europe/Madrid`.

## Aviso

Sin autenticación: úsala en red privada o detrás de un control de acceso que gestiones tú.
