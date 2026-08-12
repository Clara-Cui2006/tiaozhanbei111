from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator

from .config import settings
from .security import hash_password


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    settings.database_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(settings.database_path, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('ordinary','department_supervisor','leadership','data_admin','system_admin')),
  department TEXT,
  permissions TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  session_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_number TEXT NOT NULL UNIQUE,
  case_name TEXT NOT NULL,
  department TEXT NOT NULL,
  category TEXT NOT NULL,
  crime TEXT,
  legal_cause TEXT,
  governance_themes TEXT NOT NULL DEFAULT '[]',
  accepted_date TEXT,
  closed_date TEXT,
  status TEXT,
  street_status TEXT NOT NULL DEFAULT '待确认地址',
  street_name TEXT,
  address TEXT,
  keywords TEXT,
  summary TEXT,
  key_groups TEXT,
  key_industries TEXT,
  internal_transfer_status TEXT NOT NULL DEFAULT '未形成线索',
  prosecutorial_track TEXT,
  political_topic TEXT,
  political_location_factor TEXT,
  political_behavior_content TEXT,
  political_subject TEXT,
  political_spread_impact TEXT,
  political_review_status TEXT NOT NULL DEFAULT '不属于政治安全',
  political_risk_level TEXT,
  source_batch_id INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cases_department ON cases(department);
CREATE INDEX IF NOT EXISTS idx_cases_street ON cases(street_status, street_name);
CREATE INDEX IF NOT EXISTS idx_cases_internal_transfer ON cases(internal_transfer_status);
CREATE INDEX IF NOT EXISTS idx_cases_political ON cases(political_review_status, political_risk_level);
CREATE TABLE IF NOT EXISTS import_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  file_sha256 TEXT NOT NULL,
  status TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  valid_rows INTEGER NOT NULL DEFAULT 0,
  error_rows INTEGER NOT NULL DEFAULT 0,
  errors TEXT NOT NULL DEFAULT '[]',
  imported_by INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  confirmed_at TEXT
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  detail TEXT NOT NULL DEFAULT '{}',
  client_ip TEXT,
  success INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
CREATE TABLE IF NOT EXISTS ai_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  module TEXT NOT NULL,
  case_ids TEXT NOT NULL DEFAULT '[]',
  input_sha256 TEXT NOT NULL,
  output TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  reviewed_by INTEGER,
  reviewed_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by INTEGER,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  target TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  status TEXT NOT NULL,
  is_political INTEGER NOT NULL DEFAULT 0,
  political_category TEXT,
  department TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS legal_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  community TEXT,
  audience_group TEXT,
  scene TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '待人工审核',
  department TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_legal_plans_status ON legal_plans(status);
CREATE TABLE IF NOT EXISTS monthly_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  sections TEXT NOT NULL,
  metrics TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('生成中','待审核','审核退回','已发布')),
  generated_by_ai INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER NOT NULL,
  reviewed_by INTEGER,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_month ON monthly_reports(month);
"""


def init_database() -> None:
    with connect() as db:
        db.executescript(SCHEMA)
        _migrate_cases(db)
        count = db.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        if count == 0 and settings.bootstrap_password:
            db.execute(
                "INSERT INTO users(username, display_name, password_hash, role, department, permissions, created_at) VALUES(?,?,?,?,?,?,?)",
                (settings.bootstrap_username, "初始系统管理员", hash_password(settings.bootstrap_password), "system_admin", None,
                 json.dumps(["user:manage", "system:manage", "audit:read"], ensure_ascii=False), utc_now()),
            )


def _migrate_cases(db: sqlite3.Connection) -> None:
    columns = {row["name"] for row in db.execute("PRAGMA table_info(cases)").fetchall()}
    additions = {
        "legal_cause": "TEXT",
        "governance_themes": "TEXT NOT NULL DEFAULT '[]'",
        "key_groups": "TEXT",
        "key_industries": "TEXT",
        "internal_transfer_status": "TEXT NOT NULL DEFAULT '未形成线索'",
        "prosecutorial_track": "TEXT",
        "political_topic": "TEXT",
        "political_location_factor": "TEXT",
        "political_behavior_content": "TEXT",
        "political_subject": "TEXT",
        "political_spread_impact": "TEXT",
        "political_review_status": "TEXT NOT NULL DEFAULT '不属于政治安全'",
        "political_risk_level": "TEXT",
    }
    for name, definition in additions.items():
        if name not in columns:
            db.execute(f"ALTER TABLE cases ADD COLUMN {name} {definition}")


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    return dict(row) if row is not None else None


def write_audit(*, user: dict[str, Any] | None, action: str, resource_type: str,
                resource_id: str | int | None, detail: dict[str, Any] | None,
                client_ip: str | None, success: bool) -> None:
    with connect() as db:
        db.execute(
            "INSERT INTO audit_logs(user_id, username, action, resource_type, resource_id, detail, client_ip, success, created_at) VALUES(?,?,?,?,?,?,?,?,?)",
            (user.get("id") if user else None, user.get("username") if user else None, action, resource_type,
             str(resource_id) if resource_id is not None else None, json.dumps(detail or {}, ensure_ascii=False),
             client_ip, int(success), utc_now()),
        )
