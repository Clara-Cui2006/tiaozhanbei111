#!/usr/bin/env bash
set -euo pipefail

MODE="all"
if [[ "${1:-}" == "--staged" ]]; then
  MODE="staged"
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v git >/dev/null 2>&1; then
  if [[ "$MODE" == "staged" ]]; then
    echo "未检测到 git，无法执行 staged 扫描。"
    exit 1
  fi
fi

declare -a BLOCKED_FILE_PATTERNS=(
  "^.env$"
  "^.env\\..+$"
  ".*\\.pem$"
  ".*\\.p12$"
  ".*\\.pfx$"
  ".*\\.key$"
  "^id_rsa$"
  "^id_ed25519$"
)

declare -a BLOCKED_CONTENT_PATTERNS=(
  "BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY"
  "AKIA[0-9A-Z]{16}"
  "ASIA[0-9A-Z]{16}"
  "(?i)(secret|api|access|private)[_-]?(key|token|password)\\s*[:=]\\s*['\"][^'\"]{8,}['\"]"
  "(?i)(secret|api|access|private)[_-]?(key|token|password)\\s*[:=]\\s*[^[:space:]#]{8,}"
)

collect_files() {
  if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    if [[ "$MODE" == "staged" ]]; then
      git diff --cached --name-only --diff-filter=ACMRTUXB
    else
      git ls-files
    fi
  else
    if [[ "$MODE" == "staged" ]]; then
      echo "当前目录不是 git 仓库，无法执行 staged 扫描。" >&2
      return 1
    fi
    find . -type f \
      ! -path './node_modules/*' \
      ! -path './dist/*' \
      ! -path './native/build/*' \
      ! -path './.git/*' | sed 's#^\./##'
  fi
}

failed=0

while IFS= read -r rel_path; do
  [[ -z "$rel_path" ]] && continue
  [[ ! -f "$rel_path" ]] && continue

  if [[ "$rel_path" == node_modules/* || "$rel_path" == dist/* || "$rel_path" == native/build/* ]]; then
    continue
  fi

  for pattern in "${BLOCKED_FILE_PATTERNS[@]}"; do
    if [[ "$rel_path" =~ $pattern ]]; then
      echo "[阻断] 检测到禁止提交文件：$rel_path"
      failed=1
    fi
  done

  if ! grep -Iq . "$rel_path"; then
    continue
  fi

  for pattern in "${BLOCKED_CONTENT_PATTERNS[@]}"; do
    if grep -nE "$pattern" "$rel_path" >/tmp/secret_scan_hit.$$ 2>/dev/null; then
      echo "[阻断] 检测到疑似敏感信息：$rel_path"
      head -n 3 /tmp/secret_scan_hit.$$ || true
      failed=1
    fi
    rm -f /tmp/secret_scan_hit.$$ || true
  done
done < <(collect_files)

if [[ "$failed" -ne 0 ]]; then
  echo "扫描失败：请移除明文敏感信息后重试。"
  exit 1
fi

echo "敏感信息扫描通过。"