#!/usr/bin/env bash
# pg_dump del contenedor `db` con rotación diaria.
#
# Uso:
#   scripts/backup.sh                    # vuelca a ./backups/
#   BACKUP_DIR=/var/backups scripts/backup.sh
#   KEEP_DAYS=14 scripts/backup.sh
#
# Cron diario a las 3:30:
#   30 3 * * * cd /opt/gastodehoy && ./scripts/backup.sh >> /var/log/gastodehoy-backup.log 2>&1

set -euo pipefail

cd "$(dirname "$0")/.."

BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-7}"
POSTGRES_USER="${POSTGRES_USER:-gastodehoy}"
POSTGRES_DB="${POSTGRES_DB:-gastodehoy}"

mkdir -p "$BACKUP_DIR"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
out="$BACKUP_DIR/gastodehoy-$stamp.sql.gz"

echo "[backup] dumping $POSTGRES_DB to $out"
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  | gzip -9 > "$out"

# Comprueba que el dump no está vacío (>1 KiB) para detectar fallos silenciosos.
if [ ! -s "$out" ] || [ "$(stat -f%z "$out" 2>/dev/null || stat -c%s "$out")" -lt 1024 ]; then
  echo "[backup] FAIL: dump vacío o sospechoso, se borra: $out" >&2
  rm -f "$out"
  exit 1
fi

echo "[backup] ok ($(du -h "$out" | cut -f1))"

# Rotación: borra dumps con más de KEEP_DAYS días.
find "$BACKUP_DIR" -maxdepth 1 -name 'gastodehoy-*.sql.gz' -type f \
  -mtime +"$KEEP_DAYS" -print -delete
