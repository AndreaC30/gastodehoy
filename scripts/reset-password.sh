#!/usr/bin/env bash
# Resetea la contraseña de un usuario desde el host. Útil cuando alguien ha
# perdido a la vez su contraseña y su código de recuperación.
#
# Uso:
#   scripts/reset-password.sh user@example.com
#
# Si la app corre en docker compose, ejecuta dentro del contenedor `app`.
# Si no, asume que tienes un Python con dependencias instaladas en el PATH.

set -euo pipefail

if [ "${1-}" = "" ]; then
  echo "Uso: $0 <email>" >&2
  exit 2
fi

cd "$(dirname "$0")/.."

if docker compose ps --status running --services 2>/dev/null | grep -q '^app$'; then
  exec docker compose exec app python -m app.cli.reset_password "$1"
fi

exec python -m app.cli.reset_password "$1"
