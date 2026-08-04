from __future__ import annotations

import shutil
import subprocess
import sys


REQUIRED_TOOLS = [
    ("node", ["node", "-v"]),
    ("npm", ["npm", "-v"]),
    ("python3", ["python3", "--version"]),
    ("pip3", ["pip3", "--version"]),
    ("g++", ["g++", "--version"]),
    ("cmake", ["cmake", "--version"]),
    ("ninja", ["ninja", "--version"]),
    ("nginx", ["nginx", "-v"]),
    ("systemctl", ["systemctl", "--version"]),
    ("openssl", ["openssl", "version"]),
]


def read_version(command: list[str]) -> str:
    process = subprocess.run(command, capture_output=True, text=True, check=False)
    output = process.stdout.strip() or process.stderr.strip()
    first_line = output.splitlines()[0] if output else "unknown"
    return first_line


def main() -> int:
    missing: list[str] = []

    print("检查 Linux 服务器依赖环境中...\n")
    for tool_name, version_cmd in REQUIRED_TOOLS:
        path = shutil.which(tool_name)
        if not path:
            missing.append(tool_name)
            print(f"[缺失] {tool_name}")
            continue

        version = read_version(version_cmd)
        print(f"[OK] {tool_name:<8} {version}")

    if missing:
        print("\n缺失工具：" + ", ".join(missing))
        print("建议执行：npm run env:setup")
        return 1

    print("\n环境检查通过。")
    return 0


if __name__ == "__main__":
    sys.exit(main())