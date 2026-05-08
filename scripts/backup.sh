#!/usr/bin/env bash
# Backup atómico del SQLite con rotación diaria.
#
# Uso:
#   scripts/backup.sh                    # vuelca a ./backups/
#   BACKUP_DIR=/var/backups scripts/backup.sh
#   KEEP_DAYS=14 scripts/backup.sh
#
# Cron diario a las 3:30:
#   30 3 * * * cd /opt/gastodehoy && ./scripts/backup.sh >> /var/log/gastodehoy-backup.log 2>&1
#
# Detalles:
# - Usa la API "online backup" de SQLite (vía app.cli.backup) dentro del
#   contenedor `app`. Es seguro aunque la app esté escribiendo.
# - El archivo se transfiere por stdout y se gzip-ea ya en el host, así
#   no hace falta `sqlite3` en el host ni dejar archivos sueltos en el
#   volumen.

set -euo pipefail

cd "$(dirname "$0")/.."

BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-7}"

mkdir -p "$BACKUP_DIR"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
out="$BACKUP_DIR/gastodehoy-$stamp.db.gz"

echo "[backup] dumping to $out"

# Backup -> archivo temporal en el contenedor -> stdout -> gzip en host -> archivo.
# El cleanup del temporal va incluido para no ensuciar el volumen.
docker compose exec -T app sh -c '
  set -e
  tmp="$(mktemp /tmp/gastodehoy-backup.XXXXXX.db)"
  trap "rm -f \"$tmp\"" EXIT
  python -m app.cli.backup "$tmp" >/dev/null
  cat "$tmp"
' | gzip -9 > "$out"

# Comprueba que el dump no está vacío (>1 KiB) para detectar fallos silenciosos.
if [ ! -s "$out" ] || [ "$(stat -f%z "$out" 2>/dev/null || stat -c%s "$out")" -lt 1024 ]; then
  echo "[backup] FAIL: dump vacío o sospechoso, se borra: $out" >&2
  rm -f "$out"
  exit 1
fi

echo "[backup] ok ($(du -h "$out" | cut -f1))"

# Rotación: borra dumps con más de KEEP_DAYS días.
find "$BACKUP_DIR" -maxdepth 1 -name 'gastodehoy-*.db.gz' -type f \
  -mtime +"$KEEP_DAYS" -print -delete
