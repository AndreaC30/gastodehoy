#!/usr/bin/env bash
# Despliegue correcto del contenedor «app»: reconstruye el frontend dentro de la
# imagen (Vite), no basta con --force-recreate sin build.
#
# En el servidor, tras git pull:
#   ./scripts/deploy-docker-prod.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)

echo "==> build app (--no-cache: incluye npm run build en la imagen)"
"${COMPOSE[@]}" build --no-cache app

echo "==> recrear solo app"
"${COMPOSE[@]}" up -d --force-recreate --no-deps app

echo "==> reiniciar caddy (proxy al hostname app)"
"${COMPOSE[@]}" restart caddy

echo ""
echo "==> hashes JS/CSS dentro del contenedor (deben coincidir con local tras npm run build):"
"${COMPOSE[@]}" exec -T app grep -oE "assets/[^\"'>[:space:]]+\\.(js|css)" /app/web/dist/index.html || true
