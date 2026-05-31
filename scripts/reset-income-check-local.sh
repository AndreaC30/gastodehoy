#!/usr/bin/env bash
# Reset monthly income-check state for local testing (SQLite + instructions).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB="${ROOT}/data/gastodehoy.db"
MONTH="$(date +%Y-%m)"

if [[ ! -f "$DB" ]]; then
  echo "No database at $DB"
  exit 1
fi

sqlite3 "$DB" "UPDATE user_settings SET income_check_month = NULL;"

echo "OK: income_check_month cleared for all users in $DB"
echo ""
echo "Also clear browser localStorage (DevTools → Application → Local Storage):"
echo "  gdh_income_check_${MONTH}"
echo ""
echo "Then hard-reload the app (Cmd+Shift+R)."
echo "With VITE_DEV_FORCE_INCOME_CHECK=true the question should appear once."
