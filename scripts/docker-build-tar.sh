#!/usr/bin/env bash
set -euo pipefail

project_dir="${1:?project directory is required}"
output_dir="${2:?output directory is required}"
image_name="${3:-tiaozhanbei-platform}"
image_tag="${4:-local}"

mkdir -p /var/log "$output_dir"
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
cd "$project_dir"

full_image="${image_name}:${image_tag}"
tar_path="${output_dir}/${image_name}-${image_tag}-linux-amd64.tar"

docker build --platform linux/amd64 -t "$full_image" .
docker image inspect "$full_image" >/dev/null
docker save "$full_image" -o "$tar_path"
sha256sum "$tar_path" > "${tar_path}.sha256"
gzip -c "$tar_path" > "${tar_path}.gz"
sha256sum "${tar_path}.gz" > "${tar_path}.gz.sha256"

printf '%s\n' "$tar_path"
