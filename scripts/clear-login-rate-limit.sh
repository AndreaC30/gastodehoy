#!/usr/bin/env bash
# Clear login/forgot-password rate-limit rows (fixes HTTP 429 in local dev).
# Usage: ./scripts/clear-login-rate-limit.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${DATABASE_URL:-sqlite:///./data/gastodehoy.db}"
# sqlite:///./data/gastodehoy.db -> ./data/gastodehoy.db
PATH_PART="${DB#sqlite:///}"
if [[ ! -f "$PATH_PART" ]]; then
  echo "Database not found: $PATH_PART"
  exit 1
fi
sqlite3 "$PATH_PART" "DELETE FROM login_attempts;"
echo "Cleared login_attempts in $PATH_PART"
