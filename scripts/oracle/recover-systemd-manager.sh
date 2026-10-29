#!/usr/bin/env bash
# Bounded, one-time-per-boot recovery of systemd's failed daemon-reload.
# The systemd *system manager* handles SIGTERM as daemon-reexec, not VM reboot.
# Only invoke from the protected Oracle production runner; no SQL or app data writes.
set -Eeuo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
[[ "$EUID" == 0 && "$#" == 0 ]] || exit 64
[[ "${GITHUB_REPOSITORY:-}" == 'unedev00/uneengine' ]] || exit 64
[[ "$(uname -m)" == 'aarch64' ]] || exit 64
[[ "$(cat /proc/1/comm)" == 'systemd' ]] || exit 1
version="$(systemctl --version | sed -nE '1s/^systemd ([0-9]+).*/\1/p')"
[[ "$version" =~ ^[0-9]+$ ]] && ((version >= 239)) || exit 1

# A routine success never signals PID 1. Other errors also fail closed.
set +e
timeout 35 systemctl daemon-reload
rc=$?
set -e
if [[ "$rc" == 0 ]]; then
 echo 'Oracle systemd manager reload succeeded; no reexecution required.'
 exit 0
fi
if [[ "$rc" != 124 ]]; then
 echo "Oracle systemd daemon-reload failed unexpectedly (code $rc); recovery blocked." >&2
 exit 1
fi

# Never repeatedly reexecute the manager within one boot. Marker is atomic.
marker=/run/lock/metadrive-systemd-manager-reexec-once
( set -C; printf 'single audited systemd reexecution\n' > "$marker" ) || {
 echo 'Oracle systemd manager reexecution already attempted this boot; stopped.' >&2
 exit 1
}
echo 'Oracle daemon-reload timed out. Requesting one documented systemd manager reexecution.'
# For PID 1 systemd v239+, SIGTERM serializes state then reexecutes the manager.
# It does not request a host reboot or terminate managed applications.
kill -s TERM 1
for attempt in 1 2 3 4 5 6 7 8; do
 sleep 3
 if timeout 6 systemctl show --property=Version --value >/dev/null 2>&1; then
   if timeout 35 systemctl daemon-reload; then
     echo 'Oracle systemd manager recovered after reexecution.'
     exit 0
   fi
   break
 fi
done
echo 'Oracle systemd manager still unhealthy after single reexecution. Deployment blocked.' >&2
exit 1
