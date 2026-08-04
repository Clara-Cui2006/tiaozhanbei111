#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "This script is for a Linux intranet server only."
  exit 1
fi

for command_name in python3 nginx systemctl rsync curl; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing runtime dependency: $command_name"
    exit 1
  fi
done

PYTHON_MINOR="$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
if [[ "$PYTHON_MINOR" != "3.11" ]]; then
  echo "Python 3.11 is required for the prepared offline wheelhouse. Current python3 is $PYTHON_MINOR."
  exit 1
fi

APP_NAME="community-legal-risk-platform"
SERVICE_USER="legal-risk"
BUNDLE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_TARGET="/opt/$APP_NAME/app"
WEB_TARGET="/var/www/$APP_NAME"
VENV_TARGET="/opt/$APP_NAME/venv"
DATA_TARGET="/var/lib/$APP_NAME"
LOG_TARGET="/var/log/$APP_NAME"
ENV_TARGET="/etc/$APP_NAME/runtime.env"
NGINX_TARGET="/etc/nginx/conf.d/$APP_NAME.conf"
SERVICE_TARGET="/etc/systemd/system/$APP_NAME-api.service"

[[ -d "$BUNDLE_ROOT/dist" ]] || { echo "Missing dist. Deploy from an offline bundle."; exit 1; }
[[ -d "$BUNDLE_ROOT/wheelhouse" ]] || { echo "Missing wheelhouse. Do not download dependencies inside the intranet."; exit 1; }
[[ -f "$ENV_TARGET" ]] || { echo "Missing $ENV_TARGET. Create it from config/runtime.env.example first."; exit 1; }

if ! id "$SERVICE_USER" >/dev/null 2>&1; then
  sudo useradd --system --home-dir "/opt/$APP_NAME" --shell /usr/sbin/nologin "$SERVICE_USER"
fi

echo "[1/6] Installing offline Python runtime"
sudo python3 -m venv "$VENV_TARGET"
sudo "$VENV_TARGET/bin/pip" install --no-index --find-links "$BUNDLE_ROOT/wheelhouse" -r "$BUNDLE_ROOT/requirements-server.txt"

echo "[2/6] Publishing backend, frontend, and local assets"
sudo mkdir -p "$APP_TARGET" "$WEB_TARGET" "$DATA_TARGET" "$LOG_TARGET"
sudo rsync -a --delete "$BUNDLE_ROOT/server/" "$APP_TARGET/server/"
sudo rsync -a --delete "$BUNDLE_ROOT/dist/" "$WEB_TARGET/"
sudo chown -R "$SERVICE_USER:$SERVICE_USER" "/opt/$APP_NAME" "$DATA_TARGET" "$LOG_TARGET"
sudo chmod 600 "$ENV_TARGET"

echo "[3/6] Installing systemd service"
sudo cp "$BUNDLE_ROOT/deploy/systemd/platform-api.service" "$SERVICE_TARGET"
sudo sed -i "s#__SERVICE_USER__#$SERVICE_USER#g; s#__APP_ROOT__#$APP_TARGET#g; s#__ENV_FILE__#$ENV_TARGET#g; s#__VENV_DIR__#$VENV_TARGET#g; s#__DATA_DIR__#$DATA_TARGET#g; s#__LOG_DIR__#$LOG_TARGET#g" "$SERVICE_TARGET"

echo "[4/6] Installing Nginx intranet site"
sudo cp "$BUNDLE_ROOT/deploy/nginx/community-legal-risk-platform.conf" "$NGINX_TARGET"
sudo sed -i "s#__WEB_ROOT__#$WEB_TARGET#g" "$NGINX_TARGET"

echo "[5/6] Starting and validating services"
sudo systemctl daemon-reload
sudo systemctl enable --now "$APP_NAME-api.service"
sudo nginx -t
sudo systemctl reload nginx

echo "[6/6] Running health check"
curl --fail --silent http://127.0.0.1:8090/health >/dev/null
echo "Deployment complete. Real case data, model endpoints, and secrets remain outside the source directory."
