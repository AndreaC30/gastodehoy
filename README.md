# GastoDeHoy

Web sencilla que te dice **cuánto puedes gastar hoy** sin salirte del presupuesto del mes. Llevas tu ingreso, tus gastos fijos y los gastos del día a día; la app calcula tu margen diario.

Construido con **FastAPI** (Python), **SQLite** (un archivo en `./data/`), **React + Vite + Tailwind**. En producción usa **Caddy** para HTTPS automático.

---

## 1. Probarla en tu ordenador

Solo necesitas **Docker**. Tres comandos:

```bash
git clone <url> gastodehoy
cd gastodehoy
cp .env.example .env
docker compose up -d --build
```

Abre **http://localhost:8000** y crea tu cuenta. La pantalla te enseñará **una sola vez** un código de recuperación tipo `gdh-xxxx-xxxx-xxxx-xxxx`. Cópialo a tu gestor de contraseñas; te servirá si algún día olvidas tu contraseña.

Tus datos viven en `./data/gastodehoy.db` (un único archivo SQLite). Si quieres empezar de cero, para los contenedores y bórralo:

```bash
docker compose down
rm -rf data
```

¿No arranca? Mira los logs:

```bash
docker compose logs --tail=200 app
```

---

## 2. Desplegarla en un servidor con HTTPS

Pensado para un VPS (Hetzner, DigitalOcean, OVH…) o una Raspberry Pi expuesta. Necesitas:

- Un **dominio** apuntando a la IP del servidor (registro A/AAAA).
- Los puertos **80** y **443** abiertos en el firewall.
- **Docker** instalado en el servidor.

### Paso 1 — Clona el repo en el servidor

```bash
git clone <url> /opt/gastodehoy
cd /opt/gastodehoy
```

### Paso 2 — Configura el `.env`

```bash
cp .env.example .env
```

Edita `.env` y rellena al menos estas cuatro variables:

```ini
SITE_DOMAIN=gastos.tudominio.com
ACME_EMAIL=tu-email@ejemplo.com
APP_SECRET=<clave secreta de 32+ caracteres>
COOKIE_SECURE=true
```

Para generar el `APP_SECRET`:

```bash
openssl rand -hex 32
```

> La app se **negará a arrancar** si `COOKIE_SECURE=true` y el `APP_SECRET` es el por defecto o tiene menos de 32 caracteres. Es a propósito.

### Paso 3 — Levanta los contenedores

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Caddy pide y renueva el certificado de Let's Encrypt automáticamente. Solo Caddy escucha al exterior; la app vive en una red interna.

Abre **https://gastos.tudominio.com** y crea tu primera cuenta.

### Paso 4 — Programa backups diarios (recomendado)

```bash
crontab -e
```

Añade esta línea para un dump cada día a las 3:30 con rotación de 7 días:

```cron
30 3 * * * cd /opt/gastodehoy && ./scripts/backup.sh >> /var/log/gastodehoy-backup.log 2>&1
```

---

## 3. Tareas habituales

### Resetear la contraseña de alguien

Si un usuario pierde la contraseña **y** el código de recuperación, desde el servidor:

```bash
./scripts/reset-password.sh user@example.com
```

Te pedirá la nueva contraseña por terminal, invalidará las sesiones del usuario y te imprimirá un nuevo código de recuperación que tendrás que pasarle.

### Hacer un backup manual

```bash
./scripts/backup.sh                  # rotación de 7 días (por defecto)
KEEP_DAYS=14 ./scripts/backup.sh     # rotación de 14 días
```

Los backups se guardan en `./backups/` como `gastodehoy-YYYYMMDDTHHMMSSZ.db.gz`. Cada uno es una copia atómica del archivo SQLite (segura aunque la app esté escribiendo) ya comprimida.

### Restaurar un backup

```bash
docker compose stop app
gunzip -c backups/gastodehoy-XXXX.db.gz > data/gastodehoy.db
docker compose start app
```

### Actualizar a una versión nueva

```bash
cd /opt/gastodehoy
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

> Si la nueva versión añade columnas a la BBDD, el README de esa versión te lo dirá. En ese caso, haz un backup antes de actualizar.

---

## 4. Desarrollar el código

Si vas a tocar el código (no solo desplegar), te resultará más cómodo correr la app y el front en tu máquina con recarga en caliente. SQLite no necesita servicios extra.

```bash
# 1. Backend con auto-reload
cp .env.example .env
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000

# 2. Front con auto-reload (en otra terminal)
cd web && npm install && npm run dev
```

Abre **http://localhost:5173**. La BBDD SQLite se crea sola en `./data/gastodehoy.db`.

¿El puerto 8000 está ocupado? Lanza uvicorn en otro puerto y crea `web/.env`:

```bash
uvicorn app.main:app --reload --port 8001
```

```ini
VITE_API_PROXY_TARGET=http://127.0.0.1:8001
```

### Tests

```bash
pip install -r requirements-dev.txt
pytest
```

Los tests usan SQLite en memoria, sin tocar la BBDD real. Cubren la API y la lógica del presupuesto. El front se valida con `npm run build`.

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

---

## Versiones

Python 3.13 · SQLite (incluido en Python) · Node 22 · Tailwind v4 · Docker Compose v2.
