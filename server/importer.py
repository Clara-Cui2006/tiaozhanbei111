from __future__ import annotations

import csv
import hashlib
import io
import json
from dataclasses import dataclass
from typing import Any

from openpyxl import load_workbook

REQUIRED_FIELDS = ("案件编号", "案件名称", "业务条线", "案件类别")
ALLOWED_STREET_STATUS = {"已确认街道", "待确认地址", "跨街道案件", "与西城无地域关联"}


@dataclass
class ParsedImport:
    rows: list[dict[str, Any]]
    errors: list[dict[str, Any]]
    sha256: str


def _read_rows(filename: str, content: bytes) -> list[dict[str, Any]]:
    if filename.lower().endswith(".csv"):
        text = content.decode("utf-8-sig")
        return [dict(row) for row in csv.DictReader(io.StringIO(text))]
    if filename.lower().endswith(".xlsx"):
        workbook = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        sheet = workbook.active
        values = sheet.iter_rows(values_only=True)
        headers = [str(value or "").strip() for value in next(values)]
        return [dict(zip(headers, row)) for row in values]
    if filename.lower().endswith(".json"):
        data = json.loads(content.decode("utf-8"))
        if not isinstance(data, list):
            raise ValueError("JSON 顶层必须为数组")
        return [dict(item) for item in data]
    raise ValueError("仅支持 .xlsx、.csv 或 .json 文件")


def parse_import(filename: str, content: bytes) -> ParsedImport:
    rows = _read_rows(filename, content)
    normalized: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []
    seen: set[str] = set()
    for number, row in enumerate(rows, start=2):
        missing = [field for field in REQUIRED_FIELDS if not str(row.get(field) or "").strip()]
        case_number = str(row.get("案件编号") or "").strip()
        if case_number in seen:
            errors.append({"row": number, "field": "案件编号", "message": "文件内案件编号重复"})
            continue
        seen.add(case_number)
        if missing:
            errors.append({"row": number, "field": ",".join(missing), "message": "必填字段缺失"})
            continue
        street_status = str(row.get("街道归属状态") or "待确认地址").strip()
        if street_status not in ALLOWED_STREET_STATUS:
            errors.append({"row": number, "field": "街道归属状态", "message": "街道状态不符合规定口径"})
            continue
        normalized.append({
            "case_number": case_number,
            "case_name": str(row["案件名称"]).strip(),
            "department": str(row["业务条线"]).strip(),
            "category": str(row["案件类别"]).strip(),
            "crime": str(row.get("罪名") or "").strip(),
            "accepted_date": str(row.get("受理日期") or "").strip(),
            "closed_date": str(row.get("办结日期") or "").strip(),
            "status": str(row.get("案件状态") or "").strip(),
            "street_status": street_status,
            "street_name": str(row.get("所属街道") or "").strip() or None,
            "address": str(row.get("地址") or "").strip(),
            "keywords": str(row.get("关键词") or "").strip(),
            "summary": str(row.get("案件摘要") or "").strip(),
        })
    return ParsedImport(normalized, errors, hashlib.sha256(content).hexdigest())
