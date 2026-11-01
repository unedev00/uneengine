#!/usr/bin/env bash
# Recover only FAILED socket-activated MCP broker unit state from a systemd
# manager overloaded by thousands of retained failed connection instances.
# No service stops, restarts, secret reads, SQL changes or host reboots.
set -Eeuo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
[[ "${EUID}" == 0 && "${#}" == 0 ]] || exit 64
[[ "${GITHUB_REPOSITORY:-}" == 'unedev00/uneengine' ]] || exit 64
[[ "$(uname -m)" == aarch64 ]] || exit 64
[[ "$(cat /proc/1/comm)" == systemd ]] || exit 1

# The currently installed socket template must exist before writing a
# narrowly scoped drop-in. Future failed Accept=yes connections can be
# collected without losing their recorded errors in journald.
unit=metadrive-mcp-broker@.service
test -f "/etc/systemd/system/$unit"
dropin="/etc/systemd/system/$unit.d"
install -d -o root -g root -m 0755 "$dropin"
tmp="$(mktemp "$dropin/.10-collect.conf.XXXXXXXX")"
trap 'rm -f -- "$tmp"' EXIT
printf '[Unit]\nCollectMode=inactive-or-failed\n' > "$tmp"
chmod 0644 "$tmp"
mv -f -- "$tmp" "$dropin/10-collect.conf"
trap - EXIT

# Never use a single wildcard reset of >15k failed units: that previously
# timed out. Reset in bounded batches; the --failed filter cannot select a
# running broker or the API/worker/NGINX units.
listing="$(timeout 30 systemctl list-units --all --failed --no-legend --plain 'metadrive-mcp-broker@*.service')"
units=()
while IFS= read -r line; do
  if [[ "$line" =~ (metadrive-mcp-broker@[A-Za-z0-9_.-]+\.service) ]]; then
    units+=("${BASH_REMATCH[1]}")
  fi
done <<< "$listing"
echo "Failed MCP broker instance states to reset: ${#units[@]}"
(( ${#units[@]} <= 30000 )) || { echo 'Unexpected MCP broker unit count; refusing unbounded cleanup' >&2; exit 1; }

batch=96
for (( offset=0; offset<${#units[@]}; offset+=batch )); do
  timeout 30 systemctl reset-failed -- "${units[@]:offset:batch}"
  if (( offset % (batch*10) == 0 )); then
    echo "Reset failed broker state through index $((offset+batch)) of ${#units[@]}"
  fi
done

# All changes are limited to failed service bookkeeping and a template drop-in.
# The caller still MUST complete daemon-reload and verify API/worker health
# before any release activation.
echo 'Bounded failed MCP broker cleanup finished; daemon-reload still required.'
