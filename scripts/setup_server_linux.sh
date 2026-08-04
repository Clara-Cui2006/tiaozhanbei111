#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "该脚本仅用于 Linux 服务器。"
  exit 1
fi

if ! command -v apt >/dev/null 2>&1; then
  echo "未检测到 apt，当前脚本仅支持 apt 体系。"
  exit 1
fi

echo "[1/5] 更新 apt 索引..."
sudo apt update

echo "[2/5] 安装运行与构建依赖..."
sudo apt install -y \
  ca-certificates \
  curl \
  rsync \
  nginx \
  openssl \
  kmod \
  python3 \
  python3-venv \
  python3-pip \
  python3-dev \
  build-essential \
  g++ \
  make \
  cmake \
  ninja-build \
  pkg-config

echo "[3/5] 创建 Python 虚拟环境..."
if [[ ! -d ".venv" ]]; then
  python3 -m venv .venv
fi

source .venv/bin/activate
python -m pip install --upgrade pip

echo "[4/5] 安装 Python 依赖..."
python -m pip install -r requirements-server.txt

echo "[5/5] 启用 Nginx 自启动..."
sudo systemctl enable nginx

echo "完成：Linux 服务器基础环境已就绪。"