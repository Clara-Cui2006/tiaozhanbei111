#!/usr/bin/env bash
set -euo pipefail

archive_path="${1:?Docker tar or tar.gz path is required}"

mkdir -p /var/log
if ! docker info >/dev/null 2>&1; then
  if ! pgrep -x dockerd >/dev/null 2>&1; then
    nohup dockerd --host=unix:///var/run/docker.sock >/var/log/dockerd.log 2>&1 &
  fi
  for _ in $(seq 1 60); do
    docker info >/dev/null 2>&1 && break
    sleep 1
  done
fi

docker info >/dev/null
test -f "$archive_path"

if test -f "${archive_path}.sha256"; then
  (cd "$(dirname "$archive_path")" && sha256sum -c "$(basename "${archive_path}.sha256")")
fi

case "$archive_path" in
  *.tar.gz|*.tgz) gzip -t "$archive_path" ;;
  *.tar) tar -tf "$archive_path" >/dev/null ;;
  *) printf 'Unsupported archive: %s\n' "$archive_path" >&2; exit 2 ;;
esac

docker load -i "$archive_path"
