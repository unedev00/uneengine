#!/usr/bin/env bash
# Ensure the main-domain frontend forwards /api to the existing local API.
# Idempotent, with Nginx validation and immediate rollback on failed checks.
set -Eeuo pipefail
[[ "${EUID}" == 0 ]] || { echo "Must execute as root" >&2; exit 1; }
site=/etc/nginx/sites-available/metadrive-frontend
test -f "$site"
grep -Eq 'server_name[[:space:]]+unesolutions[.]co[.]uk' "$site"
if grep -Eq 'location[[:space:]]+(\^~[[:space:]]+)?/api/' "$site"; then
  echo "Frontend API proxy already configured"
else
  backup="$(mktemp /etc/nginx/sites-available/.metadrive-frontend.XXXXXXXX)"
  cp -p "$site" "$backup"
  restore() {
    cp -p "$backup" "$site"
    nginx -t >/dev/null 2>&1 && systemctl reload nginx || true
    rm -f "$backup"
  }
  trap restore ERR
  python3 - "$site" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1])
s=p.read_text()
needle='    location / {'
if s.count(needle)!=1:
    raise SystemExit('Unexpected frontend vhost structure; no changes applied')
location='''    location ^~ /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 5s;
        proxy_read_timeout 60s;
    }
'''
p.write_text(s.replace(needle,location+needle,1))
PY
  nginx -t
  systemctl reload nginx
  echo "Effective Nginx API locations:"
  nginx -T 2>/dev/null | grep -A 12 'location \^~ /api/' | head -n 16 || true
  for hostname in unesolutions.co.uk api.unesolutions.co.uk; do
    direct=$(curl --noproxy '*' --max-time 5 -s -o /dev/null -w '%{http_code}' --resolve "$hostname:443:127.0.0.1" -X POST -H 'Content-Type: application/json' --data '{}' "https://$hostname/api/auth/federation/complete" || true)
    echo "Local HTTPS $hostname: $direct"
  done
  code="$(curl --noproxy '*' --silent --show-error --max-time 10 --resolve unesolutions.co.uk:443:127.0.0.1 -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' --data '{}' https://unesolutions.co.uk/api/auth/federation/complete)"
  [[ "$code" == "204" ]] || { echo "Unexpected local federation status: $code" >&2; false; }
  trap - ERR
  rm -f "$backup"
fi
echo "Frontend API reverse proxy verified."
