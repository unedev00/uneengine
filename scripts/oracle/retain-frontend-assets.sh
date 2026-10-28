#!/usr/bin/env bash
set -euo pipefail
# Retain native assets from three preceding builds for tabs opened before deployment.
# Native manifests prevent copied legacy files accumulating across every release.
RELEASE="${1:?new release required}"
shift
test -d "$RELEASE/assets"
if [ ! -f "$RELEASE/.native-assets" ]; then
  (cd "$RELEASE" && find assets -type f -print) > "$RELEASE/.native-assets"
fi
count=0
for prior in "$@"; do
  [ "$prior" != "$RELEASE" ] || continue
  [ -d "$prior/assets" ] || continue
  count=$((count + 1))
  [ "$count" -le 3 ] || break
  # Bootstrap manifests for releases created before this retention mechanism.
  if [ ! -f "$prior/.native-assets" ]; then
    (cd "$prior" && find assets -type f -print) > "$prior/.native-assets"
  fi
  while IFS= read -r asset; do
    case "$asset" in assets/*) ;; *) continue ;; esac
    case "$asset" in *..*) continue ;; esac
    [ -f "$prior/$asset" ] || continue
    [ ! -e "$RELEASE/$asset" ] || continue
    mkdir -p "$(dirname "$RELEASE/$asset")"
    cp "$prior/$asset" "$RELEASE/$asset"
    chmod a+r "$RELEASE/$asset"
  done < "$prior/.native-assets"
done
