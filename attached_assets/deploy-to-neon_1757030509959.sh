#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL is not set."
  echo "Example: export DATABASE_URL='postgresql://user:pass@host.neon.tech/dbname?sslmode=require'"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[1/4] Applying schema..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT_DIR/database/schema/cross_source_merge_schema.sql"

echo "[2/4] Creating functions..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT_DIR/database/schema/cross_source_merge_functions.sql"

echo "[3/4] Creating views..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT_DIR/database/schema/cross_source_queries.sql"

WITH_SAMPLE=0
WITH_OPENPHONE=0

for arg in "$@"; do
  case "$arg" in
    --with-sample-data) WITH_SAMPLE=1 ;;
    --with-openphone)   WITH_OPENPHONE=1 ;;
  esac
done

if [[ "$WITH_SAMPLE" -eq 1 ]]; then
  echo "[4/4] Loading sample data..."
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT_DIR/database/schema/cross_source_ingest.sql"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "\copy staging_messages FROM '$ROOT_DIR/sample_data/cross_source_timeline_v0_1.csv' WITH CSV HEADER"
fi

if [[ "$WITH_OPENPHONE" -eq 1 ]]; then
  echo "[4/4] Preparing OpenPhone adapter..."
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT_DIR/database/schema/openphone_ingest.sql"
  echo "Now import your OpenPhone CSV into staging_openphone_messages, e.g.:"
  echo "  psql \"\$DATABASE_URL\" -c \"\\copy staging_openphone_messages FROM 'OpenPhone Data/ORuce0BjRH_messages.csv' WITH CSV HEADER\""
  echo "Then re-run: psql \"\$DATABASE_URL\" -f \"$ROOT_DIR/database/schema/openphone_ingest.sql\" to transform."
fi

echo "Done."
