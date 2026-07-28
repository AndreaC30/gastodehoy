#!/usr/bin/env bash
# Deploy staging (dev.gastodehoy.es) from the develop branch.
# Run on the VPS inside /root/gastodehoy-dev (or set GDH_STAGING_DIR).
set -euo pipefail

ROOT="${GDH_STAGING_DIR:-/root/gastodehoy-dev}"
COMPOSE=(docker compose -p gastodehoy-dev -f docker-compose.yml -f docker-compose.staging.yml)

cd "$ROOT"

git fetch origin
git checkout develop
git pull --ff-only origin develop

"${COMPOSE[@]}" up -d --build
"${COMPOSE[@]}" ps
echo "Staging HEAD: $(git rev-parse --short HEAD)"
echo "Open https://dev.gastodehoy.es"
