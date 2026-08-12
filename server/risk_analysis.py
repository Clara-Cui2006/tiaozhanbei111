from __future__ import annotations

import json
from collections import Counter
from typing import Any, Iterable

GOVERNANCE_CATEGORIES = (
    "邻里与社区治理",
    "民生权益保障",
    "公共安全治理",
    "生态环境与市容治理",
    "市场秩序与企业经营",
    "刑事犯罪与社会治安",
)

CRIMINAL_LAW_CHAPTERS = (
    "危害国家安全罪",
    "危害公共安全罪",
    "破坏社会主义市场经济秩序罪",
    "侵犯公民人身权利、民主权利罪",
    "侵犯财产罪",
    "妨害社会管理秩序罪",
    "贪污贿赂罪",
)


def _list(value: Any) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    try:
        decoded = json.loads(value)
    except (TypeError, ValueError):
        decoded = str(value).replace("，", ",").replace("、", ",").replace("；", ",").split(",")
    if not isinstance(decoded, list):
        return []
    return [str(item).strip() for item in decoded if str(item).strip()]


def governance_themes(row: dict[str, Any]) -> list[str]:
    return [theme for theme in _list(row.get("governance_themes")) if theme in GOVERNANCE_CATEGORIES]


def filter_cases_by_category(rows: Iterable[dict[str, Any]], category: str | None) -> list[dict[str, Any]]:
    materialized = list(rows)
    if not category:
        return materialized
    if category in GOVERNANCE_CATEGORIES:
        return [row for row in materialized if category in governance_themes(row)]
    return [row for row in materialized if row.get("category") == category]


def build_case_categories(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    materialized = list(rows)
    result = []
    for theme in GOVERNANCE_CATEGORIES:
        matches = filter_cases_by_category(materialized, theme)
        counts = Counter(
            str(row.get("category") or "").strip()
            for row in matches
            if str(row.get("category") or "").strip() in CRIMINAL_LAW_CHAPTERS
        )
        result.append({
            "name": theme,
            "value": len(matches),
            "children": [{"name": chapter, "value": counts[chapter]} for chapter in CRIMINAL_LAW_CHAPTERS if counts[chapter]],
        })
    return result


def build_case_subjects(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    result = []
    for row in rows:
        name = str(row.get("subject_name") or "").strip()
        if not name:
            continue
        result.append({
            "id": row.get("id"),
            "name": name,
            "age": int(row.get("subject_age") or 0),
            "gender": row.get("subject_gender") or "男",
            "occupation": row.get("subject_occupation") or "未填写",
            "specialIdentity": row.get("subject_special_identity") or "无",
            "isResident": True,
            "crime": row.get("crime") or row.get("legal_cause") or row.get("category") or "未填写",
            "summary": row.get("summary") or "",
        })
    return result


def build_case_time_trends(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    materialized = list(rows)
    counts = Counter(str(row.get("accepted_date") or row.get("created_at") or "")[:7] for row in materialized)
    common_themes = Counter(theme for row in materialized for theme in governance_themes(row))
    label = common_themes.most_common(1)[0][0] if common_themes else "全部案件"
    return [{"period": period, "count": counts[period], "category": label} for period in sorted(counts) if period]


def build_case_feature_words(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    counts: Counter[str] = Counter()
    for row in rows:
        for field in ("keywords", "key_groups", "key_industries"):
            counts.update(_list(row.get(field)))
    return [{"name": name, "value": value} for name, value in counts.most_common(50)]
