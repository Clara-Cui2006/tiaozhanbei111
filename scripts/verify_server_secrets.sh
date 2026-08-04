#!/usr/bin/env bash
set -euo pipefail

APP_NAME="community-legal-risk-platform"
SECRETS_DIR="/etc/$APP_NAME/secrets"
KEY_FILE="$SECRETS_DIR/runtime.key"
ENC_FILE="$SECRETS_DIR/runtime.env.enc"

if [[ ! -f "$KEY_FILE" || ! -f "$ENC_FILE" ]]; then
  echo "缺少密钥或密文文件。"
  exit 1
fi

key_perm="$(stat -c '%a' "$KEY_FILE")"
enc_perm="$(stat -c '%a' "$ENC_FILE")"
if [[ "$key_perm" != "600" || "$enc_perm" != "600" ]]; then
  echo "权限错误：key=$key_perm enc=$enc_perm（都必须为600）"
  exit 1
fi

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

if ! sudo openssl enc -d -aes-256-cbc -pbkdf2 -in "$ENC_FILE" -out "$tmp_file" -pass "file:$KEY_FILE"; then
  echo "密文校验失败：无法解密。"
  exit 1
fi

if ! grep -q '=' "$tmp_file"; then
  echo "密文内容格式异常：未检测到 env 键值格式。"
  exit 1
fi

echo "敏感信息密文校验通过。"