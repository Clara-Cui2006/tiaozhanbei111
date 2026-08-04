#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "该脚本仅用于 Linux 服务器。"
  exit 1
fi

APP_NAME="community-legal-risk-platform"
APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$APP_ROOT/dist"
WEB_TARGET_DIR="/var/www/$APP_NAME"
NATIVE_TARGET_ROOT="/opt/$APP_NAME"
NATIVE_BUILD_DIR="$NATIVE_TARGET_ROOT/native/build"
TARGET_SCRIPTS_DIR="$NATIVE_TARGET_ROOT/scripts"
SECRETS_DIR="/etc/$APP_NAME/secrets"
ENC_FILE="$SECRETS_DIR/runtime.env.enc"
KEY_FILE="$SECRETS_DIR/runtime.key"

NGINX_TEMPLATE="$APP_ROOT/deploy/nginx/community-legal-risk-platform.conf"
NGINX_AVAILABLE="/etc/nginx/sites-available/$APP_NAME.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/$APP_NAME.conf"

SYSTEMD_TEMPLATE="$APP_ROOT/deploy/systemd/risk-engine.service"
SYSTEMD_UNIT_NAME="$APP_NAME-risk-engine.service"
SYSTEMD_UNIT_PATH="/etc/systemd/system/$SYSTEMD_UNIT_NAME"

ensure_systemd_required() {
  if ! command -v systemctl >/dev/null 2>&1; then
    echo "部署失败：systemd 为必选项，但当前系统缺少 systemctl。"
    exit 1
  fi
}

ensure_encrypted_secrets() {
  if [[ ! -f "$ENC_FILE" || ! -f "$KEY_FILE" ]]; then
    echo "部署失败：未检测到加密敏感信息文件。"
    echo "请先执行：bash scripts/encrypt_server_secrets.sh <明文env文件路径>"
    exit 1
  fi

  local key_perm
  key_perm="$(stat -c '%a' "$KEY_FILE")"
  if [[ "$key_perm" != "600" ]]; then
    echo "部署失败：$KEY_FILE 权限必须是 600，当前为 $key_perm。"
    exit 1
  fi

  local enc_perm
  enc_perm="$(stat -c '%a' "$ENC_FILE")"
  if [[ "$enc_perm" != "600" ]]; then
    echo "部署失败：$ENC_FILE 权限必须是 600，当前为 $enc_perm。"
    exit 1
  fi
}

ensure_systemd_required
ensure_encrypted_secrets

if [[ ! -d "$APP_ROOT/node_modules" ]]; then
  npm --prefix "$APP_ROOT" install
fi

echo "[1/7] 构建前端产物..."
npm --prefix "$APP_ROOT" run build

if [[ ! -d "$DIST_DIR" ]]; then
  echo "构建失败：未生成 dist 目录。"
  exit 1
fi

echo "[2/7] 构建 C++ 原生模块..."
npm --prefix "$APP_ROOT" run native:build

echo "[3/7] 发布前端静态资源..."
sudo mkdir -p "$WEB_TARGET_DIR"
sudo rsync -av --delete "$DIST_DIR/" "$WEB_TARGET_DIR/"

echo "[4/7] 发布 C++ 原生产物..."
sudo mkdir -p "$NATIVE_BUILD_DIR"
sudo rsync -av --delete "$APP_ROOT/native/build/" "$NATIVE_BUILD_DIR/"

echo "[5/7] 下发运行脚本并加载加密加速模块..."
sudo mkdir -p "$TARGET_SCRIPTS_DIR"
sudo cp "$APP_ROOT/scripts/load_crypto_accel_module.sh" "$TARGET_SCRIPTS_DIR/load_crypto_accel_module.sh"
sudo chmod 755 "$TARGET_SCRIPTS_DIR/load_crypto_accel_module.sh"
sudo "$TARGET_SCRIPTS_DIR/load_crypto_accel_module.sh"

echo "[6/8] 下发并启用 Nginx 站点..."
sudo cp "$NGINX_TEMPLATE" "$NGINX_AVAILABLE"
sudo sed -i "s#__APP_ROOT__#$WEB_TARGET_DIR#g" "$NGINX_AVAILABLE"
sudo ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"

echo "[7/8] 安装并启动 systemd 服务（必选）..."
sudo cp "$SYSTEMD_TEMPLATE" "$SYSTEMD_UNIT_PATH"
sudo sed -i "s#__APP_NAME__#$APP_NAME#g" "$SYSTEMD_UNIT_PATH"
sudo sed -i "s#__NATIVE_BUILD_DIR__#$NATIVE_BUILD_DIR#g" "$SYSTEMD_UNIT_PATH"
sudo sed -i "s#__SECRETS_DIR__#$SECRETS_DIR#g" "$SYSTEMD_UNIT_PATH"
sudo sed -i "s#__SCRIPTS_DIR__#$TARGET_SCRIPTS_DIR#g" "$SYSTEMD_UNIT_PATH"
sudo systemctl daemon-reload
sudo systemctl enable --now "$SYSTEMD_UNIT_NAME"
if ! sudo systemctl is-active --quiet "$SYSTEMD_UNIT_NAME"; then
  echo "部署失败：$SYSTEMD_UNIT_NAME 未正常运行。"
  sudo systemctl --no-pager --full status "$SYSTEMD_UNIT_NAME" || true
  exit 1
fi

echo "[8/8] 验证并重载 Nginx..."
sudo nginx -t
sudo systemctl reload nginx

echo "部署完成。"