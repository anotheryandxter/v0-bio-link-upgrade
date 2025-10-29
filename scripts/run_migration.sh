#!/usr/bin/env bash
# Safe runner for scripts/009_remove_theme_preference.sql
# Usage (macOS / zsh):
#   export DATABASE_URL="postgres://user:pass@host:5432/dbname"
#   ./scripts/run_migration.sh
# OR one-liner:
#   DATABASE_URL="postgres://user:pass@host:5432/dbname" ./scripts/run_migration.sh

set -euo pipefail

SQL_FILE="$(dirname "$0")/009_remove_theme_preference.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "ERROR: SQL file not found: $SQL_FILE"
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set."
  echo "Set DATABASE_URL to a Postgres connection string (psql-compatible)."
  exit 2
fi

# Confirm action with the user
read -p "About to run migration $SQL_FILE against the DB in DATABASE_URL. Have you backed up the database? (type 'yes' to continue) " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted by user. Backup your DB and re-run when ready.";
  exit 3
fi

# Run the SQL file using psql. psql reads DATABASE_URL if provided.
# -v ON_ERROR_STOP=1 ensures psql exits non-zero on first error.
# -q quiet mode
PSQL_CMD="psql"

if ! command -v "$PSQL_CMD" >/dev/null 2>&1; then
  echo "ERROR: psql not found on PATH. Install the Postgres client or run the SQL via your DB provider's SQL editor (e.g., Supabase SQL)."
  exit 4
fi

echo "Running migration..."

# Run the SQL file
PGOPTIONS="--client-min-messages=warning" PGPASSWORD="" "$PSQL_CMD" "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$SQL_FILE"

STATUS=$?
if [ $STATUS -eq 0 ]; then
  echo "Migration applied successfully."
else
  echo "Migration failed with exit code $STATUS"
fi

exit $STATUS
