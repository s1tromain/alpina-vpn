#!/usr/bin/env bash
#
# Alpina VPN — daily backup of PostgreSQL + receipts.
#
# Suitable for `cron` on the VPS, e.g.:
#
#   # /etc/cron.d/alpinavpn-backup
#   30 3 * * *  root  /opt/alpinavpn/scripts/backup.sh >> /var/log/alpinavpn-backup.log 2>&1
#
# Writes to ${BACKUP_DIR:-/var/backups/alpinavpn}:
#
#   db/db-YYYYmmdd-HHMMSS.sql.gz
#   receipts/receipts-YYYYmmdd-HHMMSS.tar.gz
#
# Retention: keeps the last ${BACKUP_RETENTION:-14} of each.
#
# Tooling assumed: docker compose v2, GNU find, gzip, tar.
# Defaults are sane; override via env or a sourced .env.

set -euo pipefail

BACKUP_DIR=${BACKUP_DIR:-/var/backups/alpinavpn}
BACKUP_RETENTION=${BACKUP_RETENTION:-14}
COMPOSE_PROJECT=${COMPOSE_PROJECT:-alpinavpn}
POSTGRES_USER=${POSTGRES_USER:-alpinavpn}
POSTGRES_DB=${POSTGRES_DB:-alpinavpn}
RECEIPTS_VOLUME=${RECEIPTS_VOLUME:-${COMPOSE_PROJECT}_receipts-data}

ts=$(date +%Y%m%d-%H%M%S)
db_dir="${BACKUP_DIR}/db"
receipts_dir="${BACKUP_DIR}/receipts"
mkdir -p "${db_dir}" "${receipts_dir}"

echo "[$(date -Is)] backup starting → ${BACKUP_DIR}"

# --- Postgres dump ---------------------------------------------------------
# Run pg_dump inside the postgres container so the script doesn't need
# Postgres client tools installed on the host.
db_file="${db_dir}/db-${ts}.sql.gz"
docker exec -i "${COMPOSE_PROJECT}-postgres" \
    pg_dump --no-owner --no-privileges -U "${POSTGRES_USER}" "${POSTGRES_DB}" \
  | gzip -9 > "${db_file}"
echo "  db   → ${db_file} ($(du -h "${db_file}" | cut -f1))"

# --- Receipts archive ------------------------------------------------------
# Tar the bind-volume contents. Using `docker run --rm -v` keeps the script
# portable across hosts that don't have direct access to the volume path.
receipts_file="${receipts_dir}/receipts-${ts}.tar.gz"
docker run --rm \
  -v "${RECEIPTS_VOLUME}:/data:ro" \
  -v "${receipts_dir}:/backup" \
  alpine:3 \
  sh -c "tar -czf /backup/receipts-${ts}.tar.gz -C /data ."
echo "  recv → ${receipts_file} ($(du -h "${receipts_file}" | cut -f1))"

# --- Retention -------------------------------------------------------------
# Keep newest N of each kind. `find -delete` instead of `xargs rm` because
# it handles spaces and is atomic per-file.
find "${db_dir}"       -maxdepth 1 -type f -name 'db-*.sql.gz'    -printf '%T@ %p\n' \
  | sort -nr | tail -n +"$((BACKUP_RETENTION + 1))" | cut -d' ' -f2- | xargs -r rm -f
find "${receipts_dir}" -maxdepth 1 -type f -name 'receipts-*.tar.gz' -printf '%T@ %p\n' \
  | sort -nr | tail -n +"$((BACKUP_RETENTION + 1))" | cut -d' ' -f2- | xargs -r rm -f

echo "[$(date -Is)] backup done"
