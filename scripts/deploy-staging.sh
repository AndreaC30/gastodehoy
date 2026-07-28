#!/usr/bin/env bash
# Deploy staging (dev.gastodehoy.es) from the develop branch.
# Run on the VPS inside /root/gastodehoy-dev (or set GDH_STAGING_DIR).
set -euo pipefail

ROOT="${GDH_STAGING_DIR:-/root/gastodehoy-dev}"
COMPOSE=(docker compose -f docker-compose.staging.yml)

cd "$ROOT"

git fetch origin
git checkout develop
git pull --ff-only origin develop

export COMPOSE_BAKE=false
"${COMPOSE[@]}" up -d --build
"${COMPOSE[@]}" ps
echo "Staging HEAD: $(git rev-parse --short HEAD)"
echo "Open https://dev.gastodehoy.es"
