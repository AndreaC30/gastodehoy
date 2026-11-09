#!/usr/bin/env bash
# Avisa si /health deja de responder. Un 200 no escribe log ni manda correo.
#
# Cron (producción; la instala el propietario del cron, no este repo):
#   */5 * * * * /root/gastodehoy/scripts/health-alert.sh
#
# Correo: este script no lleva contraseña SMTP. Si ADMIN_NOTIFY_EMAIL está
# definido y el host tiene sendmail o mail en el PATH, manda un solo correo
# por corte. El aviso queda en /var/tmp/gastodehoy-health-alert hasta el
# siguiente 200, así un segundo fallo del mismo corte no repite el correo.
# Si no hay sendmail ni mail, solo se añade una línea al log. El propietario
# del cron debe exportar ADMIN_NOTIFY_EMAIL y tener un sendmail o mail que
# ya funcione, sin secretos nuevos en el repo.
#
# HEALTH_URL    (default https://gastodehoy.es/health)
# HEALTH_LOG    (default /var/log/gastodehoy-health.log)
# HEALTH_STATE  (default /var/tmp/gastodehoy-health-alert)

set -euo pipefail

HEALTH_URL="${HEALTH_URL:-https://gastodehoy.es/health}"
HEALTH_LOG="${HEALTH_LOG:-/var/log/gastodehoy-health.log}"
HEALTH_STATE="${HEALTH_STATE:-/var/tmp/gastodehoy-health-alert}"

http_code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$HEALTH_URL" 2>/dev/null || true)"

if [ "$http_code" = "200" ]; then
  rm -f "$HEALTH_STATE"
  exit 0
fi

mkdir -p "${HEALTH_LOG%/*}"
stamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf '%s health check failed url=%s http=%s\n' \
  "$stamp" "$HEALTH_URL" "${http_code:-000}" >> "$HEALTH_LOG"

if [ -z "${ADMIN_NOTIFY_EMAIL:-}" ] || [ -f "$HEALTH_STATE" ]; then
  exit 0
fi

subject="GastoDeHoy /health failed"
body="$(printf 'Health check failed at %s\nURL: %s\nHTTP: %s\n' \
  "$stamp" "$HEALTH_URL" "${http_code:-000}")"

if command -v sendmail >/dev/null 2>&1; then
  {
    printf 'To: %s\n' "$ADMIN_NOTIFY_EMAIL"
    printf 'Subject: %s\n' "$subject"
    printf '\n'
    printf '%s\n' "$body"
  } | sendmail -t
elif command -v mail >/dev/null 2>&1; then
  printf '%s\n' "$body" | mail -s "$subject" "$ADMIN_NOTIFY_EMAIL"
else
  exit 0
fi

mkdir -p "${HEALTH_STATE%/*}"
printf '%s\n' "$stamp" > "$HEALTH_STATE"
