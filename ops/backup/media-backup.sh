#!/bin/sh
set -eu

backup_root=/backups/media
interval_seconds="${BACKUP_INTERVAL_SECONDS:-86400}"
retention_days="${BACKUP_RETENTION_DAYS:-14}"

require_value() {
  value="$(eval "printf '%s' \"\${$1:-}\"")"
  if [ -z "$value" ]; then
    echo "$1 is required for media backups" >&2
    exit 1
  fi
}

require_positive_integer() {
  case "$2" in
    ''|*[!0-9]*|0)
      echo "$1 must be a positive integer" >&2
      exit 1
      ;;
  esac
}

require_value STORAGE_ENDPOINT
require_value STORAGE_ACCESS_KEY_ID
require_value STORAGE_SECRET_ACCESS_KEY
require_value STORAGE_BUCKET
require_positive_integer BACKUP_INTERVAL_SECONDS "$interval_seconds"
require_positive_integer BACKUP_RETENTION_DAYS "$retention_days"

mkdir -p "$backup_root"
mc alias set source "$STORAGE_ENDPOINT" "$STORAGE_ACCESS_KEY_ID" "$STORAGE_SECRET_ACCESS_KEY" \
  --api S3v4 >/dev/null

create_backup() {
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  snapshot="$backup_root/$timestamp"
  temporary_snapshot="${snapshot}.partial"
  mkdir -p "$temporary_snapshot"

  if ! mc mirror --overwrite "source/$STORAGE_BUCKET" "$temporary_snapshot"; then
    rm -rf "$temporary_snapshot"
    echo "Media backup failed at $timestamp" >&2
    return 1
  fi

  if ! (
    cd "$temporary_snapshot" || exit 1
    find . -type f ! -name 'manifest.sha256' -exec sha256sum {} \; | sort > manifest.sha256
  ); then
    rm -rf "$temporary_snapshot"
    echo "Media backup manifest generation failed at $timestamp" >&2
    return 1
  fi
  mv "$temporary_snapshot" "$snapshot"
  touch "$backup_root/.last-success"

  find "$backup_root" -mindepth 1 -maxdepth 1 -type d -mtime "+$retention_days" \
    -exec rm -rf {} \;
  echo "Media backup completed: $timestamp"
}

while :; do
  create_backup || true
  sleep "$interval_seconds"
done
