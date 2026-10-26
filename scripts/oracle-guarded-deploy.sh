#!/usr/bin/env bash
set -Eeuo pipefail
# This script is invoked on the Oracle runner, never from a developer laptop.
# It preserves the prior service definition, takes a PostgreSQL dump and rolls
# services back on failed health checks. It never drops or rewrites SQL data.
: "${GITHUB_SHA:?GitHub commit required}"
[[ "${GITHUB_REPOSITORY:-}" == "unedev00/uneengine" ]] || { echo "Wrong repository" >&2; exit 1; }
[[ "${RUNNER_NAME:-}" == "metadrive-oracle" ]] || { echo "Wrong runner" >&2; exit 1; }
[[ "$(uname -m)" == "aarch64" ]] || exit 1
[[ "${1:-}" == "deploy" || "${1:-}" == "verify" ]] || exit 1
for service in metadrive-api.service metadrive-worker.service; do
  systemctl is-active --quiet "$service" || { echo "Inactive $service" >&2; exit 1; }
done
sudo -n true
stage="${GITHUB_WORKSPACE:?}"
test -f "$stage/apps/server/dist-system/system-support/entrypoint.js"
test -f "$stage/apps/server/dist-system/system-support/job-worker-entrypoint.js"
test -f "$stage/apps/web/dist/index.html"
base="/opt/metadrive"
if [[ "${1}" == "verify" ]]; then
  sudo -n test -d "$base/releases"
  sudo -n test -d "$base/releases/gh-8aa82a803a601734742336b6cf090adfcbf80e8c" || echo "Prior release has changed; recheck before cutover"
  echo "Pre-deployment validation passed. Production unchanged."
  exit 0
fi
# Use an explicit administrator controlled manual dispatch, never branch pushes.
[[ "${GITHUB_EVENT_NAME:-}" == "workflow_dispatch" ]] || exit 1
[[ "${GITHUB_REF:-}" == "refs/heads/main" ]] || exit 1
[[ "${DEPLOY_APPROVED:-}" == "deploy" ]] || exit 1
sudo -n bash -s -- "$stage" "$GITHUB_SHA" <<'ROOT'
set -Eeuo pipefail
umask 077
stage="$1"; sha="$2"; base=/opt/metadrive
dir="$base/releases/gh-$sha"
api=metadrive-api.service
worker=metadrive-worker.service
prev_api="$(systemctl show "$api" -p WorkingDirectory --value)"
prev_worker="$(systemctl show "$worker" -p WorkingDirectory --value)"
[[ -d "$prev_api" && -d "$prev_worker" && "$prev_api" == "$prev_worker" ]] || { echo "Invalid existing release directory"; exit 1; }
[[ "$prev_api" == "$base"/releases/* ]] || { echo "Unexpected release path"; exit 1; }
[[ "$prev_api" != "$dir" ]] || { echo "Already active"; exit 0; }
unitdir=/etc/systemd/system
apidrop="$unitdir/$api.d/90-uneengine-release.conf"
workdrop="$unitdir/$worker.d/90-uneengine-release.conf"
mkdir -p "$(dirname "$apidrop")" "$(dirname "$workdrop")"
backup="$(mktemp -d /var/backups/uneengine-cutover.XXXXXXXX)"
chmod 700 "$backup"
if [[ -f "$apidrop" ]]; then cp -p "$apidrop" "$backup/api.override"; fi
if [[ -f "$workdrop" ]]; then cp -p "$workdrop" "$backup/worker.override"; fi
restore() {
  rc=$?
  trap - ERR
  echo "Release failed; restoring prior service configuration" >&2
  if [[ -f "$backup/api.override" ]]; then cp "$backup/api.override" "$apidrop"; else rm -f "$apidrop"; fi
  if [[ -f "$backup/worker.override" ]]; then cp "$backup/worker.override" "$workdrop"; else rm -f "$workdrop"; fi
  systemctl daemon-reload
  systemctl restart "$api" "$worker" || true
  exit "$rc"
}
trap restore ERR
# PostgreSQL source of truth: require a real backup BEFORE touching services.
command -v pg_dump >/dev/null || { echo "pg_dump missing: aborting release" >&2; exit 1; }
pid="$(systemctl show "$api" -p MainPID --value)"
[[ "$pid" =~ ^[0-9]+$ && "$pid" -gt 1 ]] || exit 1
dburl="$(tr '\0' '\n' < "/proc/$pid/environ" | sed -n 's/^DATABASE_URL=//p' | head -n 1)"
[[ -n "$dburl" ]] || { echo "DATABASE_URL unavailable to backup; aborting release"; exit 1; }
PGCONNECT_TIMEOUT=10 pg_dump --dbname="$dburl" --format=custom --file="$backup/postgres.before.dump"
unset dburl
test -s "$backup/postgres.before.dump"
pg_restore --list "$backup/postgres.before.dump" >/dev/null
# Preserve live release; build artifacts and modules were prepared in runner checkout.
mkdir -p "$dir"
tar -C "$stage" --exclude=.git --exclude=.github --exclude=.env --exclude=.env.local -cf - . | tar -C "$dir" -xf -
chown -R metadrive:metadrive "$dir"
chmod -R o-rwx "$dir"
# Override both WorkingDirectory and the immutable executable path.
printf '[Service]\nWorkingDirectory=%s\nExecStart=\nExecStart=/usr/local/bin/node %s/apps/server/dist-system/system-support/entrypoint.js\n' "$dir" "$dir" > "$apidrop"
printf '[Service]\nWorkingDirectory=%s\nExecStart=\nExecStart=/usr/local/bin/node %s/apps/server/dist-system/system-support/job-worker-entrypoint.js\n' "$dir" "$dir" > "$workdrop"
systemctl daemon-reload
systemctl restart "$api" "$worker"
systemctl is-active --quiet "$api"
systemctl is-active --quiet "$worker"
# Local port derived from active API process environment, not guessed.
newpid="$(systemctl show "$api" -p MainPID --value)"
port="$(tr '\0' '\n' < "/proc/$newpid/environ" | sed -n 's/^PORT=//p' | head -n 1)"
port="${port:-10000}"
[[ "$port" =~ ^[0-9]+$ ]] || exit 1
for i in {1..20}; do
  if curl --fail --silent --show-error --max-time 4 "http://127.0.0.1:$port/health" >/dev/null; then
    trap - ERR
    echo "Backend services activated and health endpoint responding. SQL backup at $backup."
    echo "Frontend assets built at $dir/apps/web/dist; existing Nginx configuration was not changed."
    exit 0
  fi
  sleep 3
done
echo "Backend health check failed" >&2
false
ROOT
