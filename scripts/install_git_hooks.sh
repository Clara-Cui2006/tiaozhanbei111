#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v git >/dev/null 2>&1; then
  echo "未检测到 git，无法安装 hooks。"
  exit 1
fi

git config core.hooksPath .githooks
echo "已启用 hooksPath=.githooks"
echo "当前 pre-commit 会阻断明文敏感信息提交。"