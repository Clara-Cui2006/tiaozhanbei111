#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${1:-$APP_ROOT/offline-bundle}"

command -v npm >/dev/null 2>&1 || { echo "缺少 npm"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "缺少 python3"; exit 1; }

mkdir -p "$OUTPUT_DIR/wheelhouse"
npm --prefix "$APP_ROOT" ci
VITE_USE_MOCK=false npm --prefix "$APP_ROOT" run build
python3 -m pip download --only-binary=:all: --dest "$OUTPUT_DIR/wheelhouse" -r "$APP_ROOT/requirements-server.txt"
rsync -a --delete "$APP_ROOT/dist/" "$OUTPUT_DIR/dist/"
rsync -a --delete "$APP_ROOT/server/" "$OUTPUT_DIR/server/"
rsync -a --delete "$APP_ROOT/deploy/" "$OUTPUT_DIR/deploy/"
rsync -a "$APP_ROOT/scripts/deploy_server.sh" "$OUTPUT_DIR/scripts/deploy_server.sh"
cp "$APP_ROOT/requirements-server.txt" "$OUTPUT_DIR/requirements-server.txt"
find "$OUTPUT_DIR" -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > "$OUTPUT_DIR/SHA256SUMS"
echo "离线交付目录已生成：$OUTPUT_DIR"
