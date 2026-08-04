#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$ROOT_DIR/native/build"

mkdir -p "$BUILD_DIR"

GENERATOR="Ninja"
if ! command -v ninja >/dev/null 2>&1; then
	GENERATOR="Unix Makefiles"
fi

cmake -S "$ROOT_DIR/native" -B "$BUILD_DIR" -G "$GENERATOR"
cmake --build "$BUILD_DIR"

echo "C++ 原生模块构建完成：$BUILD_DIR"