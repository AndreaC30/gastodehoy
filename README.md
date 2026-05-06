# GastoDeHoy

Web muy simple: te dice **cuánto puedes gastar hoy** para no quedarte sin margen a fin de mes.

## Cómo arrancar (Docker)

En la raíz del repo:

```bash
docker compose up --build -d
```

Abre `http://localhost:8000`.

Salud: `GET /health` — devuelve `200` con `database: ok` si Postgres responde; si la base no está disponible, `503` con `database: unreachable`.

### Si no arranca (logs)

```bash
docker compose ps
docker compose logs --tail=150 web
docker compose logs --tail=50 db
```

Si el servicio `web` reinicia o muestra error al validar la zona horaria (`Europe/Madrid`), vuelve a construir la imagen tras un `git pull`: la imagen incluye `tzdata` para que `ZoneInfo` funcione en Debian slim.

## Versiones y mantenimiento

- **Python:** la imagen Docker usa **3.13** (`python:3.13-slim-bookworm`). En local, usa **3.13+** (misma major ayuda a evitar sorpresas con wheels).
- **PostgreSQL:** `docker-compose.yml` usa **`postgres:18-alpine`**. El volumen se monta en **`/var/lib/postgresql`** (así lo pide la imagen 18+; no uses `.../data` en el `compose`). Si actualizaste desde un `compose` antiguo y el contenedor `db` no arranca, en **desarrollo** suele bastar: `docker compose down -v` y volver a subir (crea datos nuevos; en producción: backup antes). Entre **majors** de Postgres hace falta **migrar** o volumen limpio.
- **Dependencias Python:** súbelas con `pip install -U -r requirements.txt` y prueba la app.
- **Imágenes Docker siempre recientes:** al construir, fuerza bajar bases actualizadas:

  ```bash
  docker compose build --pull
  docker compose up -d
  ```

## Desarrollo local (sin reconstruir la imagen)

Necesitas PostgreSQL accesible y un `.env` (ver `.env.example`). Python **3.13+** recomendado (alineado con el Dockerfile).

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Ejecuta el comando desde la carpeta del proyecto (donde está `app/`).

## Pruebas automatizadas

```bash
pip install -r requirements-dev.txt
pytest
```

- **`tests/test_budget.py`:** cálculo del resumen (sin HTTP).
- **`tests/test_api.py`:** rutas con `TestClient` (SQLite en memoria, sin Docker).

## Despliegue en tu servidor

1. `git pull`
2. `docker compose up --build -d`

## Regla de cálculo (MVP)

`(ingreso mensual − ahorro − gastos fijos − gastos variables del mes) ÷ días que quedan en el mes calendario`

La fecha de referencia usa la variable de entorno `TIMEZONE` (por defecto `Europe/Madrid`).

## Aviso

No incluye autenticación: úsala en red privada o detrás de un acceso que controles tú.
