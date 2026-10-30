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
  trap - ERR
  rm -f "$backup"
fi
# Check routing on every run, including already-configured proxies.
code=""
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  code="$(curl --noproxy '*' --silent --max-time 8 --resolve unesolutions.co.uk:443:127.0.0.1 -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' --data '{}' https://unesolutions.co.uk/api/auth/federation/complete)" || code="000"
  [[ "$code" == "204" ]] && break
  sleep 1
done
[[ "$code" == "204" ]] || { echo "Unexpected main-domain federation status: $code" >&2; false; }
echo "Frontend API reverse proxy verified."
