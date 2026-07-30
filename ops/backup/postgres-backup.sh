#!/bin/sh
set -u

backup_root=/backups/postgres
interval_seconds="${BACKUP_INTERVAL_SECONDS:-86400}"
retention_days="${BACKUP_RETENTION_DAYS:-14}"

require_positive_integer() {
  case "$2" in
    ''|*[!0-9]*|0)
      echo "$1 must be a positive integer" >&2
      exit 1
      ;;
  esac
}

require_positive_integer BACKUP_INTERVAL_SECONDS "$interval_seconds"
require_positive_integer BACKUP_RETENTION_DAYS "$retention_days"

export PGHOST="${DATABASE_HOST:-postgres}"
export PGPORT="${DATABASE_PORT:-5432}"
export PGUSER="${DATABASE_USER:-postgres}"
export PGPASSWORD="${DATABASE_PASSWORD:-password}"
export PGDATABASE="${DATABASE_NAME:-appdb}"
database_target="${DATABASE_URL:-$PGDATABASE}"
backup_label="${DATABASE_NAME:-database}"

mkdir -p "$backup_root"

create_backup() {
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  final_path="$backup_root/${backup_label}_${timestamp}.dump"
  temporary_path="${final_path}.partial"

  if ! pg_dump --dbname="$database_target" --format=custom --no-owner --no-privileges \
    --file="$temporary_path"; then
    rm -f "$temporary_path"
    echo "PostgreSQL backup failed at $timestamp" >&2
    return 1
  fi

  mv "$temporary_path" "$final_path"
  (
    cd "$backup_root" || exit 1
    sha256sum "$(basename "$final_path")" > "$(basename "$final_path").sha256"
  )
  touch "$backup_root/.last-success"

  find "$backup_root" -type f -name '*.dump' -mtime "+$retention_days" -delete
  find "$backup_root" -type f -name '*.dump.sha256' -mtime "+$retention_days" -delete
  echo "PostgreSQL backup completed: $(basename "$final_path")"
}

while :; do
  create_backup || true
  sleep "$interval_seconds"
done
