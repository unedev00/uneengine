#!/usr/bin/env bash
set -euo pipefail
# Run on the trusted production Oracle runner after building from a full checkout.
DIST="${1:?build directory required}"
SHA="${2:?commit SHA required}"
[[ "$SHA" =~ ^[a-f0-9]{40}$ ]] || { echo "Invalid SHA" >&2; exit 1; }
test -s "$DIST/index.html"
test -s "$DIST/acetill/index.html"
test -d "$DIST/assets"
BASE=/var/www/metadrive-frontend
RELEASE="$BASE/releases/$SHA"
mkdir -p "$BASE/releases"
if [ ! -d "$RELEASE" ]; then
  TEMP=$(mktemp -d "$BASE/releases/.pending.XXXXXXXX")
  trap 'rm -rf "$TEMP"' EXIT
  cp -a "$DIST/." "$TEMP/"
  chmod -R a+rX "$TEMP"
  mv "$TEMP" "$RELEASE"
  trap - EXIT
fi
# Do not alter existing API or other Nginx vhosts.
SITE=/etc/nginx/sites-available/metadrive-frontend
if [ ! -e "$SITE" ]; then
  cat > "$SITE" <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name unesolutions.co.uk www.unesolutions.co.uk;
    root /var/www/metadrive-frontend/current;
    index index.html;
    location /assets/ {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }
}
NGINX
  ln -s "$SITE" /etc/nginx/sites-enabled/metadrive-frontend
elif [ ! -e /etc/nginx/sites-enabled/metadrive-frontend ]; then
  ln -s "$SITE" /etc/nginx/sites-enabled/metadrive-frontend
fi
PREVIOUS=$(readlink "$BASE/current" || true)
ln -sfn "$RELEASE" "$BASE/.next"
mv -Tf "$BASE/.next" "$BASE/current"
if ! nginx -t; then
  if [ -n "$PREVIOUS" ]; then ln -sfn "$PREVIOUS" "$BASE/.next"; mv -Tf "$BASE/.next" "$BASE/current"; fi
  echo "Nginx config invalid; frontend release reverted" >&2
  exit 1
fi
systemctl reload nginx
if ! curl --fail --silent --show-error --max-time 10 -H 'Host: unesolutions.co.uk' http://127.0.0.1/ | grep -qi '<html'; then
  if [ -n "$PREVIOUS" ]; then ln -sfn "$PREVIOUS" "$BASE/.next"; mv -Tf "$BASE/.next" "$BASE/current"; systemctl reload nginx; fi
  echo "Local frontend verification failed; reverted where possible" >&2
  exit 1
fi
# Remove only older frontend releases; never touch API releases or mail data.
find "$BASE/releases" -mindepth 1 -maxdepth 1 -type d ! -path "$RELEASE" -printf '%T@ %p\n' |
  sort -nr | tail -n +4 | cut -d' ' -f2- | while IFS= read -r old; do
    if [ "$old" != "$PREVIOUS" ]; then rm -rf -- "$old"; fi
  done
echo "Oracle frontend deployed: $SHA"
