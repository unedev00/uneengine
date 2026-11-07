#!/usr/bin/env bash
# One-time CartSession retirement during the backed-up Oracle release.
set -Eeuo pipefail
[[ "${EUID}" == 0 ]] || { echo 'Root deployment helper required' >&2; exit 1; }
SOURCE="${1:?repository checkout required}"
[[ "$SOURCE" = /* && -d "$SOURCE/apps/server/dist-system" ]] || exit 1
test -r /etc/metadrive/production.env
test -f "$SOURCE/scripts/cart/retire-cart-session.mjs"
(
 set -a
 source /etc/metadrive/production.env
 set +a
 test -n "${DATABASE_URL:-${METADRIVE_DATABASE_URL:-}}"
 cd "$SOURCE"
 runuser -u metadrive -- node scripts/cart/migrate-cart-session-to-cart.mjs --apply
 runuser -u metadrive -- node scripts/cart/upgrade-cart-flow-metadata.mjs --apply
 runuser -u metadrive -- node scripts/cart/migrate-cart-page-bindings.mjs --apply --publish
 runuser -u metadrive -- node scripts/cart/retire-cart-session.mjs --apply
)
echo 'CartSession retired; CartId parent data checked.'
