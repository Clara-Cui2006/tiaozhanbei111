#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "该脚本仅用于 Linux 内网服务器。"
  exit 1
fi

for command_name in python3 nginx systemctl rsync curl; do
  command -v "$command_name" >/dev/null 2>&1 || { echo "缺少运行依赖：$command_name"; exit 1; }
done

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

[[ -d "$BUNDLE_ROOT/dist" ]] || { echo "缺少 dist，请使用离线交付包部署。"; exit 1; }
[[ -d "$BUNDLE_ROOT/wheelhouse" ]] || { echo "缺少 wheelhouse，禁止在内网在线下载依赖。"; exit 1; }
[[ -f "$ENV_TARGET" ]] || { echo "缺少 $ENV_TARGET，请按 config/runtime.env.example 由院方运维创建。"; exit 1; }

if ! id "$SERVICE_USER" >/dev/null 2>&1; then
  sudo useradd --system --home-dir "/opt/$APP_NAME" --shell /usr/sbin/nologin "$SERVICE_USER"
fi

echo "[1/6] 安装离线 Python 运行环境"
sudo python3 -m venv "$VENV_TARGET"
sudo "$VENV_TARGET/bin/pip" install --no-index --find-links "$BUNDLE_ROOT/wheelhouse" -r "$BUNDLE_ROOT/requirements-server.txt"

echo "[2/6] 发布后端、前端和本地地图"
sudo mkdir -p "$APP_TARGET" "$WEB_TARGET" "$DATA_TARGET" "$LOG_TARGET"
sudo rsync -a --delete "$BUNDLE_ROOT/server/" "$APP_TARGET/server/"
sudo rsync -a --delete "$BUNDLE_ROOT/dist/" "$WEB_TARGET/"
sudo chown -R "$SERVICE_USER:$SERVICE_USER" "/opt/$APP_NAME" "$DATA_TARGET" "$LOG_TARGET"
sudo chmod 600 "$ENV_TARGET"

echo "[3/6] 安装 systemd 服务"
sudo cp "$BUNDLE_ROOT/deploy/systemd/platform-api.service" "$SERVICE_TARGET"
sudo sed -i "s#__SERVICE_USER__#$SERVICE_USER#g; s#__APP_ROOT__#$APP_TARGET#g; s#__ENV_FILE__#$ENV_TARGET#g; s#__VENV_DIR__#$VENV_TARGET#g; s#__DATA_DIR__#$DATA_TARGET#g; s#__LOG_DIR__#$LOG_TARGET#g" "$SERVICE_TARGET"

echo "[4/6] 安装 Nginx 内网站点"
sudo cp "$BUNDLE_ROOT/deploy/nginx/community-legal-risk-platform.conf" "$NGINX_TARGET"
sudo sed -i "s#__WEB_ROOT__#$WEB_TARGET#g" "$NGINX_TARGET"

echo "[5/6] 启动并验证服务"
sudo systemctl daemon-reload
sudo systemctl enable --now "$APP_NAME-api.service"
sudo nginx -t
sudo systemctl reload nginx

echo "[6/6] 健康检查"
curl --fail --silent http://127.0.0.1:8090/health >/dev/null
echo "部署完成。真实案件数据、模型地址及密钥未写入源码目录。"
