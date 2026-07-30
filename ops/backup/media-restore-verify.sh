#!/bin/sh
set -eu

backup_root=/backups/media
production_bucket="${STORAGE_BUCKET:?STORAGE_BUCKET is required}"
verification_bucket="${BACKUP_VERIFY_BUCKET:-${production_bucket}-restore-verify}"
latest_snapshot="${MEDIA_BACKUP_PATH:-$(find "$backup_root" -mindepth 1 -maxdepth 1 -type d | sort | tail -n 1)}"

if [ -z "$latest_snapshot" ] || [ ! -d "$latest_snapshot" ]; then
  echo "No media backup is available for verification" >&2
  exit 1
fi

if [ "$verification_bucket" = "$production_bucket" ]; then
  echo "Restore verification bucket must not equal the production bucket" >&2
  exit 1
fi

case "$verification_bucket" in
  *-restore-verify) ;;
  *)
    echo "Restore verification bucket must end with -restore-verify" >&2
    exit 1
    ;;
esac

mc alias set source \
  "${STORAGE_ENDPOINT:?STORAGE_ENDPOINT is required}" \
  "${STORAGE_ACCESS_KEY_ID:?STORAGE_ACCESS_KEY_ID is required}" \
  "${STORAGE_SECRET_ACCESS_KEY:?STORAGE_SECRET_ACCESS_KEY is required}" \
  --api S3v4 >/dev/null

cleanup() {
  mc rm --recursive --force "source/$verification_bucket" >/dev/null 2>&1 || true
  mc rb --force "source/$verification_bucket" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

(
  cd "$latest_snapshot"
  sha256sum -c manifest.sha256
)

cleanup
mc mb "source/$verification_bucket" >/dev/null
mc mirror --overwrite --exclude 'manifest.sha256' \
  "$latest_snapshot" "source/$verification_bucket" >/dev/null

expected_count="$(find "$latest_snapshot" -type f ! -name 'manifest.sha256' | wc -l | tr -d ' ')"
restored_count="$(mc find "source/$verification_bucket" --print '{key}' | wc -l | tr -d ' ')"

if [ "$expected_count" -ne "$restored_count" ]; then
  echo "Media restore verification object count did not match the backup" >&2
  exit 1
fi

echo "Media restore verification passed using $(basename "$latest_snapshot")"
