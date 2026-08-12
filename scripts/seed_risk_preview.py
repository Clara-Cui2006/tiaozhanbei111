from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from server.config import settings
from server.database import connect, init_database
from server.risk_preview_data import clear_preview_cases, seed_preview_cases


def main() -> None:
    parser = argparse.ArgumentParser(description="写入或清除风险分析大盘本地预览数据")
    parser.add_argument("--clear", action="store_true", help="仅清除预览数据")
    args = parser.parse_args()
    init_database()
    with connect() as db:
        if args.clear:
            print(f"已清除 {clear_preview_cases(db)} 条预览案件：{settings.database_path}")
            return
        user = db.execute("SELECT id FROM users ORDER BY id LIMIT 1").fetchone()
        if not user:
            raise SystemExit("数据库中没有用户，请先配置初始管理员并启动后端一次")
        inserted, existing = seed_preview_cases(db, int(user[0]))
        print(f"已写入 {inserted} 条，已存在 {existing} 条：{settings.database_path}")


if __name__ == "__main__":
    main()
