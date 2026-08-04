#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BENCH_BIN="$ROOT_DIR/native/build/risk_engine_bench"

RECORDS="${1:-1000000}"
THREADS="${2:-0}"

if [[ ! -x "$BENCH_BIN" ]]; then
  echo "未找到压测二进制，先执行构建..."
  bash "$ROOT_DIR/scripts/build_native.sh"
fi

if [[ "$THREADS" == "0" ]]; then
  "$BENCH_BIN" "$RECORDS"
else
  "$BENCH_BIN" "$RECORDS" "$THREADS"
fi