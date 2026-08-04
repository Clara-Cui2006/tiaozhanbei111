#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${1:-$APP_ROOT/offline-bundle}"
ARCHIVE_DIR="${2:-$APP_ROOT/artifacts}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
COMMIT="$(git -C "$APP_ROOT" rev-parse --short=12 HEAD 2>/dev/null || echo local)"
PACKAGE_NAME="community-legal-risk-platform-full-${COMMIT}-${STAMP}"

for command_name in npm python3 rsync sha256sum tar; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing build dependency: $command_name"
    exit 1
  fi
done

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/wheelhouse" "$OUTPUT_DIR/scripts" "$OUTPUT_DIR/config" "$OUTPUT_DIR/data/templates" "$ARCHIVE_DIR"

if [[ "${SKIP_NPM_CI:-0}" != "1" ]]; then
  npm --prefix "$APP_ROOT" ci
else
  echo "Skipping npm ci because SKIP_NPM_CI=1"
fi
VITE_USE_MOCK=false npm --prefix "$APP_ROOT" run build
python3 -m pip download --only-binary=:all: --dest "$OUTPUT_DIR/wheelhouse" -r "$APP_ROOT/requirements-server.txt"

rsync -a --delete "$APP_ROOT/dist/" "$OUTPUT_DIR/dist/"
rsync -a --delete --exclude '__pycache__/' --exclude '*.pyc' "$APP_ROOT/server/" "$OUTPUT_DIR/server/"
rsync -a --delete "$APP_ROOT/deploy/" "$OUTPUT_DIR/deploy/"
rsync -a "$APP_ROOT/scripts/deploy_server.sh" "$OUTPUT_DIR/scripts/deploy_server.sh"
rsync -a "$APP_ROOT/requirements-server.txt" "$OUTPUT_DIR/requirements-server.txt"
rsync -a "$APP_ROOT/config/runtime.env.example" "$OUTPUT_DIR/config/runtime.env.example"
rsync -a "$APP_ROOT/data/templates/" "$OUTPUT_DIR/data/templates/"

if [[ -f "$APP_ROOT/docs/intranet-deployment.md" ]]; then
  rsync -a "$APP_ROOT/docs/intranet-deployment.md" "$OUTPUT_DIR/intranet-deployment.md"
fi

cat > "$OUTPUT_DIR/RELEASE-MANIFEST.txt" <<EOF
project=community-legal-risk-platform
git_commit=$COMMIT
build_time_utc=$STAMP
bundle_type=full_frontend_backend
vite_use_mock=false
api_base_url=/api
contains_frontend_llm_key=false
EOF

find "$OUTPUT_DIR" -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > "$OUTPUT_DIR/SHA256SUMS"

tar -C "$(dirname "$OUTPUT_DIR")" -czf "$ARCHIVE_DIR/$PACKAGE_NAME.tar.gz" "$(basename "$OUTPUT_DIR")"

if command -v zip >/dev/null 2>&1; then
  (cd "$(dirname "$OUTPUT_DIR")" && zip -qr "$ARCHIVE_DIR/$PACKAGE_NAME.zip" "$(basename "$OUTPUT_DIR")")
fi

echo "Offline bundle directory: $OUTPUT_DIR"
echo "Archive: $ARCHIVE_DIR/$PACKAGE_NAME.tar.gz"
if [[ -f "$ARCHIVE_DIR/$PACKAGE_NAME.zip" ]]; then
  echo "Archive: $ARCHIVE_DIR/$PACKAGE_NAME.zip"
fi
