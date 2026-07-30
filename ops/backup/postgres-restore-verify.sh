#!/bin/sh
set -eu

backup_root=/backups/postgres
production_database="${DATABASE_NAME:-}"
if [ -z "$production_database" ] && [ -n "${DATABASE_URL:-}" ]; then
  database_url_without_query="${DATABASE_URL%%\?*}"
  production_database="${database_url_without_query##*/}"
fi
production_database="${production_database:-appdb}"
verification_database="${BACKUP_VERIFY_DATABASE:-${production_database}_restore_verify}"
latest_backup="${BACKUP_FILE:-$(find "$backup_root" -type f -name '*.dump' | sort | tail -n 1)}"

if [ -z "$latest_backup" ] || [ ! -f "$latest_backup" ]; then
  echo "No PostgreSQL backup is available for verification" >&2
  exit 1
fi

if [ "$verification_database" = "$production_database" ]; then
  echo "Restore verification database must not equal the production database" >&2
  exit 1
fi

case "$verification_database" in
  *_restore_verify) ;;
  *)
    echo "Restore verification database must end with _restore_verify" >&2
    exit 1
    ;;
esac

export PGHOST="${DATABASE_HOST:-postgres}"
export PGPORT="${DATABASE_PORT:-5432}"
export PGUSER="${DATABASE_USER:-postgres}"
export PGPASSWORD="${DATABASE_PASSWORD:-password}"

maintenance_target=postgres
verification_target="$verification_database"
if [ -n "${DATABASE_URL:-}" ]; then
  database_url_without_query="${DATABASE_URL%%\?*}"
  database_url_query=
  case "$DATABASE_URL" in
    *\?*) database_url_query="?${DATABASE_URL#*\?}" ;;
  esac
  database_server_url="${database_url_without_query%/*}"
  maintenance_target="${database_server_url}/postgres${database_url_query}"
  verification_target="${database_server_url}/${verification_database}${database_url_query}"
fi

cleanup() {
  dropdb --maintenance-db="$maintenance_target" --if-exists "$verification_database" \
    >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

(
  cd "$(dirname "$latest_backup")"
  sha256sum -c "$(basename "$latest_backup").sha256"
)

cleanup
createdb --maintenance-db="$maintenance_target" "$verification_database"
pg_restore \
  --exit-on-error \
  --no-owner \
  --no-privileges \
  --dbname="$verification_target" \
  "$latest_backup"

table_count="$(
  psql --dbname="$verification_target" --tuples-only --no-align --command \
    "select count(*) from information_schema.tables where table_schema = 'public';"
)"
migration_count="$(
  psql --dbname="$verification_target" --tuples-only --no-align --command \
    "select count(*) from drizzle.__drizzle_migrations;"
)"

if [ "$table_count" -lt 1 ] || [ "$migration_count" -lt 1 ]; then
  echo "Restored database did not contain the expected schema and migration history" >&2
  exit 1
fi

echo "PostgreSQL restore verification passed using $(basename "$latest_backup")"
