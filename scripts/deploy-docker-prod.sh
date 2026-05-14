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

BUILD_REF="${BUILD_REF:-$(git rev-parse HEAD)-$(date -u +%Y%m%dT%H%M%SZ)}"
echo "==> BUILD_REF=${BUILD_REF}"

# Parada breve: sin esto, Compose Bake a veces marca «Built 0.0s» sin ejecutar RUN.
echo "==> parar y quitar contenedor app"
"${COMPOSE[@]}" stop app 2>/dev/null || true
"${COMPOSE[@]}" rm -f app 2>/dev/null || true

APP_IMAGE="$("${COMPOSE[@]}" config --images 2>/dev/null | grep -v '^caddy' | head -n1 || true)"
if [[ -n "${APP_IMAGE}" ]]; then
  echo "==> borrar imagen local de app: ${APP_IMAGE}"
  docker rmi -f "${APP_IMAGE}" 2>/dev/null || true
fi

export COMPOSE_BAKE=false
export DOCKER_BUILDKIT=1

echo "==> build app (--no-cache --pull BUILD_REF/npm run build en imagen)"
"${COMPOSE[@]}" build \
  --no-cache \
  --pull \
  --progress plain \
  --build-arg "BUILD_REF=${BUILD_REF}" \
  app

echo "==> recrear solo app"
"${COMPOSE[@]}" up -d --force-recreate --no-deps app

echo "==> reiniciar caddy (proxy al hostname app)"
"${COMPOSE[@]}" restart caddy

echo ""
echo "==> hashes JS/CSS dentro del contenedor (deben coincidir con local tras npm run build):"
"${COMPOSE[@]}" exec -T app grep -oE "assets/[^\"'>[:space:]]+\\.(js|css)" /app/web/dist/index.html || true
