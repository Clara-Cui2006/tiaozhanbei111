#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "该脚本需要 root 权限执行。"
  exit 1
fi

if ! command -v modprobe >/dev/null 2>&1; then
  echo "未检测到 modprobe（kmod），无法加载加密加速模块。"
  exit 1
fi

REQUIRED_MODULES=(
  af_alg
  algif_skcipher
  algif_aead
  cryptd
)

ACCEL_CANDIDATES=(
  aesni_intel
  sha256_ssse3
)

load_module() {
  local module_name="$1"
  if lsmod | awk '{print $1}' | grep -Fxq "$module_name"; then
    return 0
  fi
  modprobe "$module_name"
}

for module_name in "${REQUIRED_MODULES[@]}"; do
  if ! load_module "$module_name"; then
    echo "加载模块失败：$module_name"
    exit 1
  fi
done

accel_loaded=0
for module_name in "${ACCEL_CANDIDATES[@]}"; do
  if load_module "$module_name"; then
    accel_loaded=1
    break
  fi
done

if [[ "$accel_loaded" -eq 0 && -n "${CRYPTO_ACCEL_KO:-}" ]]; then
  if [[ ! -f "$CRYPTO_ACCEL_KO" ]]; then
    echo "CRYPTO_ACCEL_KO 指向的文件不存在：$CRYPTO_ACCEL_KO"
    exit 1
  fi
  insmod "$CRYPTO_ACCEL_KO"
  accel_loaded=1
fi

if [[ "$accel_loaded" -eq 0 ]]; then
  echo "未能加载任何加密加速模块（modprobe/insmod 均失败）。"
  exit 1
fi

echo "加密加速内核模块加载完成。"