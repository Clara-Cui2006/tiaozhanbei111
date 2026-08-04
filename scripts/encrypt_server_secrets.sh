#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "该脚本仅用于 Linux。"
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "用法：bash scripts/encrypt_server_secrets.sh <明文env文件路径>"
  exit 1
fi

PLAINTEXT_FILE="$1"
APP_NAME="community-legal-risk-platform"
SECRETS_DIR="/etc/$APP_NAME/secrets"
KEY_FILE="$SECRETS_DIR/runtime.key"
ENC_FILE="$SECRETS_DIR/runtime.env.enc"

if [[ ! -f "$PLAINTEXT_FILE" ]]; then
  echo "未找到明文文件：$PLAINTEXT_FILE"
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "未检测到 openssl，请先安装。"
  exit 1
fi

sudo mkdir -p "$SECRETS_DIR"

if [[ ! -f "$KEY_FILE" ]]; then
  sudo sh -c "openssl rand -base64 48 > '$KEY_FILE'"
fi

sudo chmod 600 "$KEY_FILE"
sudo chown root:root "$KEY_FILE"

sudo openssl enc -aes-256-cbc -pbkdf2 -salt \
  -in "$PLAINTEXT_FILE" \
  -out "$ENC_FILE" \
  -pass "file:$KEY_FILE"

sudo chmod 600 "$ENC_FILE"
sudo chown root:root "$ENC_FILE"

echo "已生成密文敏感信息文件：$ENC_FILE"
echo "请删除明文文件并避免提交到仓库。"