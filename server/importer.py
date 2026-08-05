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
ALLOWED_TRANSFER_STATUS = {"未形成线索", "系统研判", "人工复核", "研判确认", "内部移送", "办理反馈", "纳入统计"}
ALLOWED_POLITICAL_REVIEW_STATUS = {"不属于政治安全", "待人工复核", "人工研判", "研判确认", "纳入统计"}
ALLOWED_POLITICAL_RISK_LEVEL = {"关注", "低风险", "中风险", "高风险"}


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


def _text(row: dict[str, Any], field: str, default: str = "") -> str:
    return str(row.get(field) or default).strip()


def _list_text(row: dict[str, Any], field: str) -> list[str]:
    raw = _text(row, field)
    if not raw:
        return []
    return [item.strip() for item in raw.replace("，", ",").replace("、", ",").replace("；", ",").replace(";", ",").split(",") if item.strip()]


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
        street_status = _text(row, "街道归属状态", "待确认地址")
        if street_status not in ALLOWED_STREET_STATUS:
            errors.append({"row": number, "field": "街道归属状态", "message": "街道状态不符合规定口径"})
            continue
        street_name = _text(row, "所属街道")
        if street_status == "已确认街道" and not street_name:
            errors.append({"row": number, "field": "所属街道", "message": "已确认街道的数据必须填写唯一所属街道"})
            continue
        transfer_status = _text(row, "内部线索状态", "未形成线索")
        if transfer_status not in ALLOWED_TRANSFER_STATUS:
            errors.append({"row": number, "field": "内部线索状态", "message": "内部线索状态不符合闭环口径"})
            continue
        political_review_status = _text(row, "政治安全研判状态", "不属于政治安全")
        if political_review_status not in ALLOWED_POLITICAL_REVIEW_STATUS:
            errors.append({"row": number, "field": "政治安全研判状态", "message": "政治安全研判状态不符合人工复核口径"})
            continue
        political_risk_level = _text(row, "政治安全风险等级")
        if political_risk_level and political_risk_level not in ALLOWED_POLITICAL_RISK_LEVEL:
            errors.append({"row": number, "field": "政治安全风险等级", "message": "政治安全风险等级不符合规定口径"})
            continue
        normalized.append({
            "case_number": case_number,
            "case_name": _text(row, "案件名称"),
            "department": _text(row, "业务条线"),
            "category": _text(row, "案件类别"),
            "crime": _text(row, "罪名"),
            "legal_cause": _text(row, "法定罪名/案由") or _text(row, "罪名") or _text(row, "案件类别"),
            "governance_themes": _list_text(row, "治理主题标签"),
            "accepted_date": _text(row, "受理日期"),
            "closed_date": _text(row, "办结日期"),
            "status": _text(row, "案件状态"),
            "street_status": street_status,
            "street_name": street_name or None,
            "address": _text(row, "地址"),
            "keywords": _text(row, "关键词"),
            "summary": _text(row, "案件摘要"),
            "key_groups": _list_text(row, "重点人群标签"),
            "key_industries": _list_text(row, "重点行业标签"),
            "internal_transfer_status": transfer_status,
            "prosecutorial_track": _text(row, "承办检察条线"),
            "political_topic": _text(row, "政治安全专题"),
            "political_location_factor": _text(row, "地点因素"),
            "political_behavior_content": _text(row, "行为内容"),
            "political_subject": _text(row, "涉及主体"),
            "political_spread_impact": _text(row, "传播影响"),
            "political_review_status": political_review_status,
            "political_risk_level": political_risk_level,
        })
    return ParsedImport(normalized, errors, hashlib.sha256(content).hexdigest())
