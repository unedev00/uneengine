#!/usr/bin/env bash
# Orchestrate the existing Oracle API and frontend deployers as one recovery unit.
set -Eeuo pipefail
[[ "${EUID}" == 0 ]] || { echo "Root deployment helper required" >&2; exit 1; }
SOURCE="${1:?absolute repository checkout required}"
SHA="${2:?commit SHA required}"
[[ "$SOURCE" = /* && "$SHA" =~ ^[a-f0-9]{40}$ ]] || exit 1
API=metadrive-api.service
WORKER=metadrive-worker.service
FRONT=/var/www/metadrive-frontend/current
API_OVERRIDE=/etc/systemd/system/metadrive-api.service.d/90-oracle-actions.conf
WORKER_OVERRIDE=/etc/systemd/system/metadrive-worker.service.d/90-oracle-actions.conf
OLD_API_RELEASE="$(systemctl show "$API" -p WorkingDirectory --value)"
OLD_WORKER_RELEASE="$(systemctl show "$WORKER" -p WorkingDirectory --value)"
[[ -d "$OLD_API_RELEASE" && -d "$OLD_WORKER_RELEASE" ]] || exit 1
backup_dir="$(mktemp -d /var/tmp/metadrive-rollback.XXXXXXXX)"
chmod 700 "$backup_dir"
if [[ -f "$API_OVERRIDE" ]]; then cp -p "$API_OVERRIDE" "$backup_dir/api"; fi
if [[ -f "$WORKER_OVERRIDE" ]]; then cp -p "$WORKER_OVERRIDE" "$backup_dir/worker"; fi
if [[ -L "$FRONT" ]]; then readlink "$FRONT" > "$backup_dir/frontend-target"; fi
API_ACTIVATED=0
FRONT_STARTED=0
rollback() {
  local rc=$?
  trap - ERR
  echo "Combined Oracle deployment failed; restoring previous service release and frontend pointer." >&2
  if [[ "$API_ACTIVATED" == 1 ]]; then
    if [[ -f "$backup_dir/api" ]]; then cp -p "$backup_dir/api" "$API_OVERRIDE"; else rm -f "$API_OVERRIDE"; fi
    if [[ -f "$backup_dir/worker" ]]; then cp -p "$backup_dir/worker" "$WORKER_OVERRIDE"; else rm -f "$WORKER_OVERRIDE"; fi
    systemctl daemon-reload
    systemctl restart "$API" || true
    systemctl restart "$WORKER" || true
  fi
  if [[ "$FRONT_STARTED" == 1 && -f "$backup_dir/frontend-target" ]]; then
    ln -sfn "$(cat "$backup_dir/frontend-target")" /var/www/metadrive-frontend/.next
    mv -Tf /var/www/metadrive-frontend/.next "$FRONT"
    nginx -t && systemctl reload nginx || true
  fi
  exit "$rc"
}
trap rollback ERR
# Back up first, before API migrations or frontend changes. The DB is never
# automatically restored: only an authorised recovery plan may restore SQL.
bash "$SOURCE/scripts/oracle/backup-production-sql.sh"
bash "$SOURCE/scripts/oracle/deploy-api.sh" "$SOURCE" "$SHA"
API_ACTIVATED=1
# The new Page Builder requires this SQL-backed API. Never publish an
# incompatible frontend if the new backend is still serving the generic 404.
# Use the same local API health endpoint as deploy-api.sh.
api_health_url="${METADRIVE_API_HEALTH_URL:-http://127.0.0.1:3001/api/health}"
api_base="${api_health_url%/api/health}"
api_base="${api_base%/health}"
catalog_probe="$(mktemp)"
catalog_status="$(curl -sS -o "$catalog_probe" -w '%{http_code}' --max-time 15 "$api_base/api/metadata/builder-ribbon" || true)"
if [[ "$catalog_status" == 404 || "$catalog_status" == 000 || "$catalog_status" == 500 || "$catalog_status" == 502 || "$catalog_status" == 503 ]] ||
   grep -q 'API endpoint not implemented in SQL runtime' "$catalog_probe"; then
  rm -f "$catalog_probe"
  echo "SQL-backed Page Builder API is unavailable; frontend publication blocked." >&2
  exit 1
fi
rm -f "$catalog_probe"
FRONT_STARTED=1
bash "$SOURCE/scripts/oracle/deploy-frontend.sh" "$SOURCE/apps/web/dist" "$SHA"
systemctl is-active --quiet "$API"
systemctl is-active --quiet "$WORKER"
systemctl is-active --quiet nginx.service
nginx -t
trap - ERR
echo "Full stack deployed and local health checks passed at $SHA"
# Keep backup_dir and previous releases for audited recovery.
