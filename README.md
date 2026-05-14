# GastoDeHoy

Web sencilla que te dice **cuánto puedes gastar hoy** sin salirte del presupuesto del mes. Llevas tu ingreso, tus gastos fijos y los gastos del día a día; la app calcula tu margen diario.

Construido con **FastAPI** (Python), **SQLite** (un archivo en `./data/`), **React + Vite + Tailwind**. En producción usa **Caddy** para HTTPS automático.

---

## 1. Desarrollo local (Docker)

Solo necesitas **Docker**. El `docker-compose.yml` base **no publica puertos** (así en producción la app solo escucha en la red interna). En tu máquina hace falta exponer el **8000**.

### Opción recomendada: `docker-compose.override.yml` (local, no versionado)

Compose **fusiona solo** `docker-compose.yml` + `docker-compose.override.yml` si este último existe; no hace falta `-f` extra. El archivo real está en `.gitignore` para no subir tus puertos/ajustes al repo.

```bash
git clone <url> gastodehoy
cd gastodehoy
cp .env.example .env
cp docker-compose.override.example.yml docker-compose.override.yml
docker compose up -d --build
```

Abre **http://localhost:8000** y crea tu cuenta.

### Bajar (sin borrar datos)

```bash
docker compose down
```

Al volver a hacer `up -d`, tus datos persisten en `./data/gastodehoy.db`.

### Borrar la BBDD y empezar de cero

```bash
docker compose down
rm -f data/gastodehoy.db data/gastodehoy.db-wal data/gastodehoy.db-shm
docker compose up -d --build
```

> `docker compose down -v` **no borra** estos datos. SQLite vive en el filesystem del host, no en un volumen Docker con nombre.

### Ver logs

```bash
docker compose logs --tail=200 app
```

### Opción alternativa: `docker-compose.dev.yml` (versionado, explícito)

Mismo efecto que el override, pero tienes que pasar ambos ficheros:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

Útil en CI o si no quieres un `override` en disco.

---

## 2. Desarrollo local (sin Docker)

Para tocar código con recarga en caliente:

```bash
# Backend (terminal 1)
cp .env.example .env
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000

# Frontend (terminal 2)
cd web && npm install && npm run dev
```

Abre **http://localhost:5173**. La BBDD SQLite se crea sola en `./data/gastodehoy.db`.

Si el puerto 8000 está ocupado, lanza uvicorn en otro puerto y crea `web/.env`:

```ini
VITE_API_PROXY_TARGET=http://127.0.0.1:8001
```

### Tests

```bash
pip install -r requirements-dev.txt
pytest
```

Los tests usan SQLite en memoria, sin tocar la BBDD real.

---

## 3. Producción (Docker + Caddy + HTTPS)

Pensado para un VPS (Hetzner, DigitalOcean, OVH…) o una Raspberry Pi expuesta. Necesitas:

- Un **dominio** apuntando a la IP del servidor (registro A/AAAA).
- Los puertos **80** y **443** abiertos en el firewall.
- **Docker** instalado en el servidor.

### Paso 1 — Clona el repo

```bash
git clone <url> /opt/gastodehoy
cd /opt/gastodehoy
```

### Paso 2 — Configura el `.env`

```bash
cp .env.example .env
```

Edita `.env` y rellena **obligatoriamente**:

```ini
SITE_DOMAIN=gastos.tudominio.com
ACME_EMAIL=tu-email@ejemplo.com
APP_SECRET=<clave secreta de 32+ caracteres>
COOKIE_SECURE=true
```

Genera el `APP_SECRET`:

```bash
openssl rand -hex 32
```

> La app **no arranca** si `COOKIE_SECURE=true` y `APP_SECRET` es el default o tiene menos de 32 caracteres.

### Paso 3 — Levanta con el overlay de producción

**IMPORTANTE:** En producción hay que usar **ambos** archivos de compose. Si solo usas `docker-compose.yml`, Caddy no se levanta y la app no será accesible desde fuera.

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Esto levanta dos contenedores:
- **app**: la API + frontend, en red interna (sin puertos expuestos al exterior).
- **caddy**: reverse proxy con HTTPS automático vía Let's Encrypt, puertos 80 y 443.

Caddy obtiene y renueva el certificado SSL automáticamente.

Abre **https://gastos.tudominio.com** y crea tu primera cuenta.

### Paso 4 — Permisos de la BBDD

El contenedor corre como usuario `appuser` (UID 999). El directorio `./data` debe ser escribible por ese usuario:

```bash
chown 999:999 data data/gastodehoy.db
```

Si la app no arranca con error `attempt to write a readonly database`, verifica los permisos con:

```bash
ls -la data/
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs app
```

### Paso 5 — Backups diarios (recomendado)

```bash
crontab -e
```

Añade esta línea para un dump cada día a las 3:30 con rotación de 7 días:

```cron
30 3 * * * cd /opt/gastodehoy && ./scripts/backup.sh >> /var/log/gastodehoy-backup.log 2>&1
```

---

## 4. Tareas habituales

### Resetear la contraseña de alguien

Si **no** tienes recuperación por correo (SMTP) o prefieres hacerlo a mano:

```bash
./scripts/reset-password.sh user@example.com
```

Te pedirá la nueva contraseña por terminal, invalidará las sesiones del usuario y te imprimirá un **código de recuperación de solo uso** para que se lo pases al usuario en caso extremo (flujo administrativo; el uso normal es el correo con contraseña temporal).

### Hacer un backup manual

```bash
./scripts/backup.sh                  # rotación de 7 días (por defecto)
KEEP_DAYS=14 ./scripts/backup.sh     # rotación de 14 días
```

Los backups se guardan en `./backups/` como `gastodehoy-YYYYMMDDTHHMMSSZ.db.gz`. Cada uno es una copia atómica del archivo SQLite (segura aunque la app esté escribiendo) ya comprimida.

### Restaurar un backup

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop app
rm -f data/gastodehoy.db data/gastodehoy.db-wal data/gastodehoy.db-shm
gunzip -c backups/gastodehoy-XXXX.db.gz > data/gastodehoy.db
docker compose -f docker-compose.yml -f docker-compose.prod.yml start app
```

> El borrado de `*-wal` y `*-shm` antes de restaurar es importante: son archivos auxiliares de SQLite y, si quedan de la BBDD vieja, pueden corromper la nueva al arrancar.

### Actualizar a una versión nueva

```bash
cd /opt/gastodehoy
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

> Si la nueva versión añade columnas a la BBDD, el README de esa versión te lo dirá. En ese caso, haz un backup antes de actualizar.

---

## Cómo se calcula "Hoy puedes gastar"

```
techo diario = (ingreso mensual − ahorro − fijos − gastos variables del mes)
               ÷ días que quedan en el mes
```

- **Ahorro**: lo apartas antes de cualquier gasto. Puede ser un % del ingreso o una cantidad fija al mes (lo eliges al configurar).
- **Gastos fijos**: alquiler, suscripciones, lo que se paga igual cada mes.
- **Gastos variables**: lo que registras en el día a día.
- **Días que quedan**: hasta el último día del mes, en la zona horaria configurada (`TIMEZONE` en `.env`, por defecto `Europe/Madrid`).

---

## Notas de seguridad

- Contraseñas con **bcrypt**, nunca en texto plano.
- Sesión por **cookie firmada** (`HttpOnly`, `SameSite=Lax`); `Secure` solo en producción.
- **Rate limit** en login y recuperación: 5 intentos por IP cada 5 minutos.
- **Cambiar la contraseña invalida todas las sesiones** y obliga a iniciar sesión otra vez.
- Cada cuenta solo ve sus propios datos.
- En producción, Caddy añade HSTS, CSP, `X-Frame-Options=DENY`, `Referrer-Policy`, `Permissions-Policy` y oculta la cabecera `Server`.
- La BBDD es un único archivo SQLite con permisos de filesystem; sin puerto abierto ni usuario remoto. Para protegerla del robo físico del disco, cifra el filesystem del VPS (LUKS o equivalente).
- Validación de dominio MX en registro y recuperación de contraseña (desde v2026.05.13).
- Respuestas de tiempo constante en auth para evitar enumeración de usuarios.

---

## Versiones

Python 3.13 · SQLite (incluido en Python) · Node 22 · Tailwind v4 · Docker Compose v2.
