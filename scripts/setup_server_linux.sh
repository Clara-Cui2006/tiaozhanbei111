#!/usr/bin/env bash
set -euo pipefail

echo "生产服务器禁止由本项目脚本联网安装依赖。"
echo "请由院方运维预装：Python 3.11+、Nginx、systemd、rsync、OpenSSL。"
echo "应用依赖请在外网构建机执行 scripts/build_offline_bundle.sh 后离线带入。"
