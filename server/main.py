from __future__ import annotations

import hashlib
import json
from typing import Any

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from .ai import generate, get_runtime_model_settings
from .auth import can_read_case, client_ip, get_current_user, permissions_for, require_permission
from .config import settings
from .database import connect, init_database, row_to_dict, utc_now, write_audit
from .importer import parse_import
from .schemas import (AIRequest, LegalPlanPayload, MonthlyReportGenerateRequest,
                      MonthlyReportTransitionRequest, MonthlyReportUpdateRequest,
                      SettingsPayload, SuggestionPayload)
from .reference_materials import suggestion_category_distribution, suggestion_monthly_trend
from .risk_analysis import (
    GOVERNANCE_CATEGORIES,
    build_case_categories,
    build_case_feature_words,
    build_case_subjects,
    build_case_time_trends,
)

settings.validate()
app = FastAPI(title=settings.app_name, docs_url=None if settings.production else "/docs", redoc_url=None)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])


@app.on_event("startup")
def startup() -> None:
    init_database()


@app.get("/health")
def health() -> dict[str, str]:
    with connect() as db:
        db.execute("SELECT 1").fetchone()
    runtime_model = get_runtime_model_settings()
    model_status = "configured" if runtime_model.base_url and runtime_model.model_name else "not_configured"
    return {"status": "ok", "database": "connected", "model": model_status}


def _case_scope(user: dict[str, Any]) -> tuple[str, tuple[Any, ...]]:
    perms = permissions_for(user)
    if "case:read:all" in perms:
        return "1=1", ()
    if "case:read:department" in perms:
        return "department=?", (user.get("department"),)
    if "case:read:metadata" in perms:
        return "1=1", ()
    # 系统管理员可进入系统但不默认接触任何案件或案件汇总。
    return "0=1", ()


STREET_CODES = {
    "西长安街街道": "110102001",
    "新街口街道": "110102003",
    "月坛街道": "110102007",
    "展览路街道": "110102009",
    "德胜街道": "110102010",
    "金融街街道": "110102011",
    "什刹海街道": "110102012",
    "大栅栏街道": "110102013",
    "天桥街道": "110102014",
    "椿树街道": "110102015",
    "陶然亭街道": "110102016",
    "广安门内街道": "110102017",
    "牛街街道": "110102018",
    "白纸坊街道": "110102019",
    "广安门外街道": "110102020",
}

STREET_COORDINATES = {
    "西长安街街道": (116.375, 39.912),
    "新街口街道": (116.370, 39.945),
    "月坛街道": (116.345, 39.915),
    "展览路街道": (116.345, 39.925),
    "德胜街道": (116.378, 39.955),
    "金融街街道": (116.362, 39.915),
    "什刹海街道": (116.385, 39.935),
    "大栅栏街道": (116.392, 39.895),
    "天桥街道": (116.390, 39.885),
    "椿树街道": (116.372, 39.895),
    "陶然亭街道": (116.372, 39.885),
    "广安门内街道": (116.360, 39.897),
    "牛街街道": (116.360, 39.885),
    "白纸坊街道": (116.350, 39.880),
    "广安门外街道": (116.335, 39.895),
}


def _json_list(value: Any) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    try:
        decoded = json.loads(value)
    except (TypeError, ValueError):
        decoded = str(value).replace("，", ",").replace("、", ",").split(",")
    if not isinstance(decoded, list):
        return []
    return [str(item).strip() for item in decoded if str(item).strip()]


def _case_filter_clause(user: dict[str, Any], *, caseType: str | None = None,
                        governanceTheme: str | None = None,
                        locationDimension: str | None = None,
                        behaviorContent: str | None = None,
                        subjectType: str | None = None,
                        reviewStatusTopic: str | None = None,
                        politicalOnly: bool = False) -> tuple[str, list[Any]]:
    where, params = _case_scope(user)
    clauses = [where]
    values = list(params)
    if politicalOnly:
        clauses.append("political_review_status!='不属于政治安全'")
    if caseType and caseType != "all":
        clauses.append("(legal_cause=? OR crime=? OR category=?)")
        values.extend([caseType, caseType, caseType])
    if governanceTheme and governanceTheme != "all":
        clauses.append("governance_themes LIKE ?")
        values.append(f"%{governanceTheme}%")
    if locationDimension and locationDimension != "all":
        clauses.append("(street_name=? OR political_location_factor LIKE ?)")
        values.extend([locationDimension, f"%{locationDimension}%"])
    if behaviorContent and behaviorContent != "all":
        clauses.append("(political_behavior_content LIKE ? OR governance_themes LIKE ?)")
        values.extend([f"%{behaviorContent}%", f"%{behaviorContent}%"])
    if subjectType and subjectType != "all":
        clauses.append("(political_subject LIKE ? OR key_groups LIKE ?)")
        values.extend([f"%{subjectType}%", f"%{subjectType}%"])
    if reviewStatusTopic and reviewStatusTopic != "all":
        clauses.append("(political_review_status=? OR political_risk_level=? OR political_topic LIKE ?)")
        values.extend([reviewStatusTopic, reviewStatusTopic, f"%{reviewStatusTopic}%"])
    return " AND ".join(clauses), values


def _period_label(period: str | None, caseType: str | None, governanceTheme: str | None,
                  locationDimension: str | None = None, behaviorContent: str | None = None,
                  subjectType: str | None = None, reviewStatusTopic: str | None = None) -> str:
    period_map = {"30d": "近30天", "quarter": "本季度", "year": "本年度"}
    parts = [period_map.get(period or "30d", "近30天")]
    if caseType and caseType != "all":
        parts.append(f"法定罪名/案由：{caseType}")
    if governanceTheme and governanceTheme != "all":
        parts.append(f"治理主题：{governanceTheme}")
    if locationDimension and locationDimension != "all":
        parts.append(f"地点维度：{locationDimension}")
    if behaviorContent and behaviorContent != "all":
        parts.append(f"行为内容：{behaviorContent}")
    if subjectType and subjectType != "all":
        parts.append(f"涉及主体：{subjectType}")
    if reviewStatusTopic and reviewStatusTopic != "all":
        parts.append(f"专题/复核：{reviewStatusTopic}")
    return " ｜ ".join(parts)


def _top_counts(rows: list[dict[str, Any]], field: str, fallback: str) -> list[dict[str, Any]]:
    counts: dict[str, int] = {}
    for row in rows:
        values = _json_list(row.get(field)) or ([str(row.get(field) or "").strip()] if row.get(field) else [])
        if not values and fallback:
            values = [fallback]
        for value in values:
            if value:
                counts[value] = counts.get(value, 0) + 1
    return [{"name": name, "count": count, "rate": count / len(rows) if rows else 0}
            for name, count in sorted(counts.items(), key=lambda item: item[1], reverse=True)]


def _case_type_expr() -> str:
    return "COALESCE(NULLIF(legal_cause,''), NULLIF(crime,''), NULLIF(category,''), '未标注类型')"


def _month_expr(field: str = "accepted_date") -> str:
    return f"substr(COALESCE(NULLIF({field},''), created_at),1,7)"


def _parse_month(value: str | None) -> tuple[int, int] | None:
    if not value:
        return None
    try:
        year, month = value[:7].split("-")
        return int(year), int(month)
    except (ValueError, AttributeError):
        return None


def _shift_month(month: str | None, delta: int) -> str | None:
    parsed = _parse_month(month)
    if not parsed:
        return None
    year, value = parsed
    index = year * 12 + value - 1 + delta
    return f"{index // 12:04d}-{index % 12 + 1:02d}"


def _quarter_bounds(month: str | None, delta: int = 0) -> tuple[str, str] | None:
    parsed = _parse_month(month)
    if not parsed:
        return None
    year, value = parsed
    quarter_index = year * 4 + (value - 1) // 3 + delta
    q_year = quarter_index // 4
    q = quarter_index % 4
    start_month = q * 3 + 1
    end_month = start_month + 2
    return f"{q_year:04d}-{start_month:02d}", f"{q_year:04d}-{end_month:02d}"


def _change_pair(current: int, previous: int | None) -> tuple[int | None, float | None]:
    if previous is None:
        return None, None
    change = current - previous
    return change, None if previous == 0 else change / previous


def _risk_level_by_score(score: int) -> str:
    if score >= 80:
        return "高"
    if score >= 60:
        return "中"
    return "低"


def _risk_analysis_case_clause(user: dict[str, Any], category: str | None = None) -> tuple[str, list[Any]]:
    where, params = _case_scope(user)
    clauses = [where]
    values = list(params)
    if category:
        clauses.append("(category=? OR legal_cause=? OR crime=?)")
        values.extend([category, category, category])
    return " AND ".join(clauses), values


def _risk_score_for_case(row: dict[str, Any]) -> int:
    score = 45
    if row.get("internal_transfer_status") and row["internal_transfer_status"] != "未形成线索":
        score += 18
    if row.get("political_review_status") and row["political_review_status"] != "不属于政治安全":
        score += 16
    if row.get("political_risk_level") == "高风险":
        score += 18
    elif row.get("political_risk_level") == "中风险":
        score += 10
    elif row.get("political_risk_level") == "关注":
        score += 5
    if row.get("street_status") != "已确认街道":
        score += 4
    return max(0, min(100, score))


@app.get("/risk-analysis/events")
def risk_events(level: str | None = None, keyword: str | None = None, minRiskScore: int | None = None,
                community: str | None = None,
                user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    where, params = _risk_analysis_case_clause(user)
    clauses, values = [where], list(params)
    if keyword:
        clauses.append("(case_name LIKE ? OR case_number LIKE ? OR keywords LIKE ? OR summary LIKE ?)")
        values.extend([f"%{keyword}%"] * 4)
    if community:
        clauses.append("street_name=?")
        values.append(community)
    with connect() as db:
        rows = db.execute(f"SELECT * FROM cases WHERE {' AND '.join(clauses)} ORDER BY accepted_date DESC, id DESC LIMIT 500", values).fetchall()
    events: list[dict[str, Any]] = []
    for row in rows:
        case = dict(row)
        score = _risk_score_for_case(case)
        event_level = _risk_level_by_score(score)
        if level and event_level != level:
            continue
        if minRiskScore is not None and score < minRiskScore:
            continue
        events.append({
            "id": case["id"],
            "community": case.get("street_name") or case.get("street_status") or "未确认区域",
            "event": case.get("case_name") or "未命名案件",
            "level": event_level,
            "riskScore": score,
            "time": case.get("accepted_date") or case.get("created_at") or "",
            "status": case.get("internal_transfer_status") or case.get("status") or "未形成线索",
            "detail": case.get("summary") or case.get("keywords") or "暂无详情",
            "suggestion": "纳入政治安全专项研判" if case.get("political_review_status") != "不属于政治安全" else "纳入风险态势持续观察",
        })
    return events


@app.get("/risk-analysis/case-details")
def case_list(keyword: str | None = None, category: str | None = None,
              user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    where, params = _risk_analysis_case_clause(user, category)
    clauses, values = [where], list(params)
    if keyword:
        clauses.append("(case_name LIKE ? OR case_number LIKE ? OR keywords LIKE ?)")
        values.extend([f"%{keyword}%"] * 3)
    with connect() as db:
        rows = db.execute(f"SELECT * FROM cases WHERE {' AND '.join(clauses)} ORDER BY accepted_date DESC LIMIT 500", values).fetchall()
    return [{"id": r["id"], "caseName": r["case_name"], "procedureType": r["status"] or "",
             "caseNumber": r["case_number"], "keywords": r["keywords"] or "", "judgmentReason": r["summary"] or "",
             "category": r["category"], "legalCause": r["legal_cause"] or r["crime"] or r["category"],
             "governanceThemes": _json_list(r["governance_themes"])} for r in rows]


def _scoped_cases(user: dict[str, Any], category: str | None = None) -> list[dict[str, Any]]:
    where, params = _case_scope(user)
    clauses, values = [where], list(params)
    if category:
        if category in GOVERNANCE_CATEGORIES:
            clauses.append("governance_themes LIKE ?")
            values.append(f'%"{category}"%')
        else:
            clauses.append("category=?")
            values.append(category)
    with connect() as db:
        rows = db.execute(f"SELECT * FROM cases WHERE {' AND '.join(clauses)}", values).fetchall()
    return [dict(row) for row in rows]


@app.get("/risk-analysis/case-categories")
def risk_case_categories(user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    return build_case_categories(_scoped_cases(user))


@app.get("/risk-analysis/case-subjects")
def risk_case_subjects(category: str | None = None,
                       user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    return build_case_subjects(_scoped_cases(user, category))


@app.get("/risk-analysis/case-time-trends")
def risk_case_time_trends(category: str | None = None,
                          user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    return build_case_time_trends(_scoped_cases(user, category))


@app.get("/risk-analysis/case-feature-words")
def risk_case_feature_words(category: str | None = None,
                            user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    return build_case_feature_words(_scoped_cases(user, category))


@app.get("/risk-analysis/case-details/{case_id}")
def case_detail(case_id: int, request: Request, user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    with connect() as db:
        case = row_to_dict(db.execute("SELECT * FROM cases WHERE id=?", (case_id,)).fetchone())
    if not case:
        raise HTTPException(status_code=404, detail="案件不存在")
    if not can_read_case(user, case) and "case:read:metadata" not in permissions_for(user):
        write_audit(user=user, action="READ", resource_type="case", resource_id=case_id,
                    detail={"reason": "out_of_scope"}, client_ip=client_ip(request), success=False)
        raise HTTPException(status_code=403, detail="该案件不属于您的授权范围")
    metadata_only = "case:read:metadata" in permissions_for(user) and not can_read_case(user, case)
    write_audit(user=user, action="READ", resource_type="case", resource_id=case_id,
                detail={"metadataOnly": metadata_only}, client_ip=client_ip(request), success=True)
    return {"id": case["id"], "caseName": case["case_name"], "procedureType": case["status"] or "",
            "caseNumber": case["case_number"], "keywords": "" if metadata_only else (case["keywords"] or ""),
            "judgmentReason": "" if metadata_only else (case["summary"] or ""), "category": case["category"],
            "legalCause": case["legal_cause"] or case["crime"] or case["category"],
            "governanceThemes": [] if metadata_only else _json_list(case["governance_themes"])}


def _petition_supervision_categories(case: dict[str, Any]) -> list[str]:
    text = " ".join(str(case.get(key) or "") for key in ("category", "legal_cause", "prosecutorial_track"))
    categories: list[str] = []
    for keyword, label in (
        ("刑事", "刑事检察"), ("民事", "民事检察"), ("行政", "行政检察"),
        ("公益诉讼", "公益诉讼检察"), ("未成年", "未成年人检察"),
    ):
        if keyword in text and label not in categories:
            categories.append(label)
    if case.get("political_review_status") != "不属于政治安全":
        categories.append("政治安全")
    return categories


def _petition_risk_level(case: dict[str, Any]) -> str:
    score = _risk_score_for_case(case)
    if score >= 80:
        return "红色"
    if score >= 65:
        return "橙色"
    if score >= 50:
        return "黄色"
    return "蓝色"


@app.get("/petition-litigation/items")
def petition_litigation_items(user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    """以现有案件数据底座提供涉访涉诉前置研判视图。

    未接入的 36 字段返回空值，不伪造群众、案件或联系方式。
    """
    where, params = _case_scope(user)
    with connect() as db:
        rows = db.execute(
            f"SELECT * FROM cases WHERE {where} ORDER BY accepted_date DESC, id DESC LIMIT 500", params
        ).fetchall()
    items: list[dict[str, Any]] = []
    for row in rows:
        case = dict(row)
        themes = _json_list(case.get("governance_themes"))
        categories = _petition_supervision_categories(case)
        score = _risk_score_for_case(case)
        is_reverse = "反向审视" in themes
        ai_tags = themes[:6]
        if case.get("political_review_status") != "不属于政治安全" and "政治安全关联" not in ai_tags:
            ai_tags.append("政治安全关联")
        items.append({
            "id": str(case["id"]),
            "registrationTime": case.get("created_at") or "",
            "conflictNo": case.get("case_number") or "",
            "occurredAt": case.get("accepted_date") or case.get("created_at") or "",
            "occurredAddress": case.get("address") or "",
            "source": "部门流转",
            "riskLevel": _petition_risk_level(case),
            "street": case.get("street_name") or "",
            "eventName": case.get("case_name") or "",
            "eventCategory": case.get("legal_cause") or case.get("category") or "",
            "summary": case.get("summary") or "",
            "party": {
                "name": case.get("subject_name") or "",
                "age": case.get("subject_age"),
                "gender": case.get("subject_gender") or "",
                "employer": case.get("subject_occupation") or "",
            },
            "supervisionCategories": categories,
            "supervisionScore": score,
            "aiTags": ai_tags,
            "aiReasons": ["依据已入库案件类别、治理主题与人工复核状态生成辅助标签"] if categories else [],
            "riskAnalysis": [{"label": "事项关注度", "basis": "综合已有线索流转、政治安全复核和街道归属状态"}],
            "suggestedActions": ["建议由检察官进一步人工核实"] if categories else ["建议持续观察"],
            "reviewStatus": "已确认" if case.get("internal_transfer_status") != "未形成线索" else "待复核",
            "relatedCaseIds": [case.get("case_number")] if case.get("case_number") else [],
            "reverseReview": {
                "matched": is_reverse,
                "departmentId": case.get("department") if is_reverse else None,
                "departmentName": case.get("department") if is_reverse else None,
                "relatedCaseId": case.get("case_number") if is_reverse else None,
                "issueSummary": case.get("summary") if is_reverse else None,
                "status": "待核查" if is_reverse else None,
            },
        })
    return items


@app.get("/dashboard/overview")
def dashboard_overview(user: dict[str, Any] = Depends(require_permission("dashboard:read"))) -> dict[str, Any]:
    where, params = _case_scope(user)
    with connect() as db:
        total = db.execute(f"SELECT COUNT(*) FROM cases WHERE {where}", params).fetchone()[0]
        top = db.execute(f"SELECT {_case_type_expr()} AS name,COUNT(*) AS c FROM cases WHERE {where} GROUP BY name ORDER BY c DESC LIMIT 1", params).fetchone()
        risk_alerts = db.execute(f"SELECT COUNT(*) FROM cases WHERE {where} AND internal_transfer_status!='未形成线索'", params).fetchone()[0]
        suggestions = db.execute("SELECT COUNT(*) FROM suggestions").fetchone()[0]
        legal_plans = db.execute("SELECT COUNT(*) FROM legal_plans").fetchone()[0]
    return {"totalCasesThisYear": total, "highIncidenceTypes": top["name"] if top else "暂无数据",
            "riskAlertPushCount": risk_alerts, "procuratorateSuggestions": suggestions, "legalPushCount": legal_plans}


@app.get("/dashboard/risk-trend")
def dashboard_risk_trend(user: dict[str, Any] = Depends(require_permission("dashboard:read"))) -> list[dict[str, Any]]:
    where, params = _case_scope(user)
    with connect() as db:
        rows = db.execute(f"""SELECT {_month_expr()} AS month,COUNT(*) AS value
                              FROM cases WHERE {where}
                              GROUP BY month ORDER BY month DESC LIMIT 7""", params).fetchall()
    return [{"date": row["month"] or "未填日期", "value": row["value"]} for row in reversed(rows)]


@app.get("/dashboard/community-risk-points")
def dashboard_community_risk_points(user: dict[str, Any] = Depends(require_permission("dashboard:read"))) -> list[dict[str, Any]]:
    where, params = _case_scope(user)
    with connect() as db:
        case_rows = db.execute(f"""SELECT street_name,{_case_type_expr()} AS type_name,COUNT(*) count
                                   FROM cases
                                   WHERE {where} AND street_status='已确认街道' AND street_name IS NOT NULL AND street_name!=''
                                   GROUP BY street_name,type_name""", params).fetchall()
        alert_rows = db.execute(f"""SELECT street_name,COUNT(*) count
                                    FROM cases
                                    WHERE {where} AND street_status='已确认街道' AND internal_transfer_status!='未形成线索'
                                    GROUP BY street_name""", params).fetchall()
        plan_rows = db.execute("SELECT community,COUNT(*) count FROM legal_plans WHERE community IS NOT NULL AND community!='' GROUP BY community").fetchall()
    grouped: dict[str, dict[str, Any]] = {}
    for row in case_rows:
        street = row["street_name"]
        item = grouped.setdefault(street, {"annualCases": 0, "types": {}})
        item["annualCases"] += row["count"]
        item["types"][row["type_name"]] = row["count"]
    alert_counts = {row["street_name"]: row["count"] for row in alert_rows}
    plan_counts = {row["community"]: row["count"] for row in plan_rows}
    max_cases = max((item["annualCases"] for item in grouped.values()), default=0)
    points: list[dict[str, Any]] = []
    for street, item in grouped.items():
        annual_cases = int(item["annualCases"])
        score = round(annual_cases / max(1, max_cases) * 100) if max_cases else 0
        longitude, latitude = STREET_COORDINATES.get(street, (116.366794, 39.915309))
        top_types = sorted(item["types"].items(), key=lambda pair: pair[1], reverse=True)[:3]
        points.append({
            "community": street,
            "longitude": longitude,
            "latitude": latitude,
            "level": _risk_level_by_score(score),
            "riskScore": score,
            "annualCases": annual_cases,
            "alertPushCount": int(alert_counts.get(street, 0)),
            "procuratorateSuggestionCount": 0,
            "legalPlanDeliveryCount": int(plan_counts.get(street, 0)),
            "highIncidenceTypes": "、".join(name for name, _ in top_types) or "暂无数据",
            "dimensionScores": {},
        })
    return sorted(points, key=lambda item: item["annualCases"], reverse=True)


@app.get("/dashboard/multi-trend")
def dashboard_multi_trend(user: dict[str, Any] = Depends(require_permission("dashboard:read"))) -> list[dict[str, Any]]:
    where, params = _case_scope(user)
    with connect() as db:
        months = [row["month"] for row in db.execute(f"""SELECT {_month_expr()} AS month
                                                         FROM cases WHERE {where}
                                                         GROUP BY month ORDER BY month DESC LIMIT 12""", params).fetchall()]
        total_rows = db.execute(f"""SELECT {_month_expr()} AS month,COUNT(*) count
                                    FROM cases WHERE {where}
                                    GROUP BY month""", params).fetchall()
        top_type = db.execute(f"""SELECT {_case_type_expr()} AS name,COUNT(*) count
                                  FROM cases WHERE {where}
                                  GROUP BY name ORDER BY count DESC LIMIT 1""", params).fetchone()
        high_rows = db.execute(f"""SELECT {_month_expr()} AS month,COUNT(*) count
                                   FROM cases
                                   WHERE {where} AND {_case_type_expr()}=?
                                   GROUP BY month""", (*params, top_type["name"] if top_type else "")).fetchall()
        alert_rows = db.execute(f"""SELECT {_month_expr()} AS month,COUNT(*) count
                                    FROM cases
                                    WHERE {where} AND internal_transfer_status!='未形成线索'
                                    GROUP BY month""", params).fetchall()
        suggestion_rows = db.execute("""SELECT substr(COALESCE(NULLIF(issue_date,''), created_at),1,7) month,COUNT(*) count
                                        FROM suggestions GROUP BY month""").fetchall()
        plan_rows = db.execute("""SELECT substr(created_at,1,7) month,COUNT(*) count
                                  FROM legal_plans GROUP BY month""").fetchall()
    for row in suggestion_rows:
        if row["month"] not in months:
            months.append(row["month"])
    for row in plan_rows:
        if row["month"] not in months:
            months.append(row["month"])
    months = sorted(month for month in months if month)[-12:]
    total_by_month = {row["month"]: row["count"] for row in total_rows}
    high_by_month = {row["month"]: row["count"] for row in high_rows}
    alert_by_month = {row["month"]: row["count"] for row in alert_rows}
    suggestion_by_month = {row["month"]: row["count"] for row in suggestion_rows}
    plan_by_month = {row["month"]: row["count"] for row in plan_rows}
    return [{
        "date": month,
        "totalCases": int(total_by_month.get(month, 0)),
        "highIncidenceCount": int(high_by_month.get(month, 0)),
        "riskAlertPush": int(alert_by_month.get(month, 0)),
        "procuratorateSuggestion": int(suggestion_by_month.get(month, 0)),
        "legalPlanDelivery": int(plan_by_month.get(month, 0)),
    } for month in months]


@app.get("/dashboard/street-map/overview")
def street_overview(period: str = "30d", caseType: str = "all", governanceTheme: str = "all",
                    locationDimension: str = "all", behaviorContent: str = "all", subjectType: str = "all",
                    timeDimension: str = "all", reviewStatusTopic: str = "all", politicalOnly: bool = False,
                    user: dict[str, Any] = Depends(require_permission("dashboard:read"))) -> dict[str, Any]:
    where, params = _case_filter_clause(user, caseType=caseType, governanceTheme=governanceTheme,
                                        locationDimension=locationDimension, behaviorContent=behaviorContent,
                                        subjectType=subjectType, reviewStatusTopic=reviewStatusTopic,
                                        politicalOnly=politicalOnly)
    with connect() as db:
        rows = db.execute(f"SELECT street_name,COUNT(*) count FROM cases WHERE {where} AND street_status='已确认街道' GROUP BY street_name", params).fetchall()
        pending = db.execute(f"SELECT street_status,COUNT(*) count FROM cases WHERE {where} AND street_status!='已确认街道' GROUP BY street_status", params).fetchall()
    unassigned = {r["street_status"]: r["count"] for r in pending}
    confirmed = sum(r["count"] for r in rows)
    pending_count = int(unassigned.get("待确认地址", 0))
    cross_count = int(unassigned.get("跨街道案件", 0))
    excluded_count = int(unassigned.get("与西城无地域关联", 0))
    return {
        "summary": {
            "totalCases": confirmed + pending_count + cross_count + excluded_count,
            "confirmedCases": confirmed,
            "pendingCases": pending_count,
            "crossStreetCases": cross_count,
            "notInStreetCases": excluded_count,
        },
        "streets": [{"streetCode": STREET_CODES.get(r["street_name"], r["street_name"]), "streetName": r["street_name"], "caseCount": r["count"]} for r in rows if r["street_name"]],
        "unassigned": unassigned,
        "dataPeriod": _period_label(period, caseType, governanceTheme, locationDimension,
                                    behaviorContent, subjectType, reviewStatusTopic),
        "updatedAt": utc_now(),
        "statisticalNote": "政治安全模式仅统计政治安全类别案件；地图只展示已确认唯一街道归属案件。" if politicalOnly
        else "已归属街道、待确认、跨街道、不纳入街道统计四类分离；地图只展示已确认唯一街道归属案件。",
        "dataBatch": "正式业务库",
    }


@app.get("/dashboard/street-map/detail")
def street_detail(streetName: str, period: str = "30d", caseType: str = "all", governanceTheme: str = "all",
                  locationDimension: str = "all", behaviorContent: str = "all", subjectType: str = "all",
                  timeDimension: str = "all", reviewStatusTopic: str = "all", politicalOnly: bool = False,
                  user: dict[str, Any] = Depends(require_permission("dashboard:read"))) -> dict[str, Any]:
    where, params = _case_filter_clause(user, caseType=caseType, governanceTheme=governanceTheme,
                                        locationDimension=locationDimension, behaviorContent=behaviorContent,
                                        subjectType=subjectType, reviewStatusTopic=reviewStatusTopic,
                                        politicalOnly=politicalOnly)
    with connect() as db:
        total = db.execute(f"SELECT COUNT(*) FROM cases WHERE {where} AND street_status='已确认街道' AND street_name=?", (*params, streetName)).fetchone()[0]
        case_rows = db.execute(f"SELECT * FROM cases WHERE {where} AND street_status='已确认街道' AND street_name=? LIMIT 500", (*params, streetName)).fetchall()
        categories = db.execute(f"SELECT COALESCE(NULLIF(legal_cause,''), NULLIF(crime,''), category) name,COUNT(*) count FROM cases WHERE {where} AND street_status='已确认街道' AND street_name=? GROUP BY name ORDER BY count DESC LIMIT 5", (*params, streetName)).fetchall()
        transfer_rows = db.execute(f"SELECT internal_transfer_status,COUNT(*) count FROM cases WHERE {where} AND street_status='已确认街道' AND street_name=? GROUP BY internal_transfer_status", (*params, streetName)).fetchall()
        trend_rows = db.execute(f"""SELECT substr(COALESCE(NULLIF(accepted_date,''), created_at),1,7) month,COUNT(*) count
                                    FROM cases WHERE {where} AND street_status='已确认街道' AND street_name=?
                                    GROUP BY month ORDER BY month LIMIT 18""", (*params, streetName)).fetchall()
        current_month = db.execute(f"""SELECT MAX(substr(COALESCE(NULLIF(accepted_date,''), created_at),1,7))
                                       FROM cases WHERE {where} AND street_status='已确认街道' AND street_name=?""",
                                   (*params, streetName)).fetchone()[0]
        previous_month = _shift_month(current_month, -1)
        current_month_count = db.execute(f"""SELECT COUNT(*) FROM cases
                                             WHERE {where} AND street_status='已确认街道' AND street_name=?
                                             AND substr(COALESCE(NULLIF(accepted_date,''), created_at),1,7)=?""",
                                         (*params, streetName, current_month)).fetchone()[0] if current_month else None
        previous_month_count = db.execute(f"""SELECT COUNT(*) FROM cases
                                              WHERE {where} AND street_status='已确认街道' AND street_name=?
                                              AND substr(COALESCE(NULLIF(accepted_date,''), created_at),1,7)=?""",
                                          (*params, streetName, previous_month)).fetchone()[0] if previous_month else None
        current_quarter = _quarter_bounds(current_month)
        previous_quarter = _quarter_bounds(current_month, -1)
        current_quarter_count = db.execute(f"""SELECT COUNT(*) FROM cases
                                               WHERE {where} AND street_status='已确认街道' AND street_name=?
                                               AND substr(COALESCE(NULLIF(accepted_date,''), created_at),1,7) BETWEEN ? AND ?""",
                                           (*params, streetName, *current_quarter)).fetchone()[0] if current_quarter else None
        previous_quarter_count = db.execute(f"""SELECT COUNT(*) FROM cases
                                                WHERE {where} AND street_status='已确认街道' AND street_name=?
                                                AND substr(COALESCE(NULLIF(accepted_date,''), created_at),1,7) BETWEEN ? AND ?""",
                                            (*params, streetName, *previous_quarter)).fetchone()[0] if previous_quarter else None
    cases = [dict(row) for row in case_rows]
    month_change, month_rate = _change_pair(current_month_count or 0, previous_month_count)
    quarter_change, quarter_rate = _change_pair(current_quarter_count or 0, previous_quarter_count)
    theme_counts: dict[str, int] = {}
    group_counts: dict[str, int] = {}
    industry_counts: dict[str, int] = {}
    for case in cases:
        for theme in _json_list(case["governance_themes"]):
            theme_counts[theme] = theme_counts.get(theme, 0) + 1
        for group in _json_list(case["key_groups"]):
            group_counts[group] = group_counts.get(group, 0) + 1
        for industry in _json_list(case["key_industries"]):
            industry_counts[industry] = industry_counts.get(industry, 0) + 1
    transfer_summary = "、".join(f"{r['internal_transfer_status']} {r['count']} 件" for r in transfer_rows if r["internal_transfer_status"]) or "暂无线索闭环记录"
    return {
        "streetCode": STREET_CODES.get(streetName, streetName),
        "streetName": streetName,
        "caseCount": total,
        "momChangeCount": month_change,
        "momRate": month_rate,
        "yoyChangeCount": quarter_change,
        "yoyRate": quarter_rate,
        "topCaseTypes": [{"name": r["name"] or "未填", "count": r["count"], "rate": (r["count"] / total if total else 0)} for r in categories],
        "topGovernanceIssues": [{"name": name, "count": count} for name, count in sorted(theme_counts.items(), key=lambda item: item[1], reverse=True)[:5]],
        "keyGroups": [{"label": name, "count": count} for name, count in sorted(group_counts.items(), key=lambda item: item[1], reverse=True)[:5]],
        "keyIndustries": [{"name": name, "count": count} for name, count in sorted(industry_counts.items(), key=lambda item: item[1], reverse=True)[:5]],
        "subjectBreakdown": _top_counts(cases, "political_subject", "未标注主体")[:6],
        "behaviorBreakdown": _top_counts(cases, "political_behavior_content", "未标注行为")[:6],
        "timeTrend": [{"period": row["month"] or "未填日期", "count": row["count"]} for row in trend_rows],
        "newRisks": [],
        "transferClues": {"count": sum(r["count"] for r in transfer_rows if r["internal_transfer_status"] != "未形成线索"), "statusSummary": transfer_summary, "canViewDetails": True},
        "attentionItems": ["高风险识别依据案件分类标签、风险规则匹配和人工复核结果综合确定", "高发风险可按案件数量排序，异常信号需已被标记为政治安全类别"],
        "dataPeriod": _period_label(period, caseType, governanceTheme, locationDimension,
                                    behaviorContent, subjectType, reviewStatusTopic),
        "updatedAt": utc_now(),
    }


@app.post("/data/import/validate")
async def validate_import(request: Request, file: UploadFile = File(...),
                          user: dict[str, Any] = Depends(require_permission("data:import"))) -> dict[str, Any]:
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="导入文件不得超过20MB")
    try:
        parsed = parse_import(file.filename or "", content)
    except (ValueError, StopIteration, UnicodeDecodeError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    with connect() as db:
        cursor = db.execute(
            "INSERT INTO import_batches(filename,file_sha256,status,total_rows,valid_rows,error_rows,errors,imported_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
            (file.filename, parsed.sha256, "待确认", len(parsed.rows) + len(parsed.errors), len(parsed.rows), len(parsed.errors),
             json.dumps({"errors": parsed.errors, "rows": parsed.rows, "subjects": parsed.subjects}, ensure_ascii=False), user["id"], utc_now()),
        )
        batch_id = cursor.lastrowid
    write_audit(user=user, action="VALIDATE", resource_type="import_batch", resource_id=batch_id,
                detail={"filename": file.filename, "validRows": len(parsed.rows), "errorRows": len(parsed.errors)},
                client_ip=client_ip(request), success=True)
    return {"batchId": batch_id, "status": "待确认", "totalRows": len(parsed.rows) + len(parsed.errors),
            "validRows": len(parsed.rows), "errorRows": len(parsed.errors), "errors": parsed.errors[:200]}


@app.post("/data/import/{batch_id}/confirm")
def confirm_import(batch_id: int, request: Request,
                   user: dict[str, Any] = Depends(require_permission("data:import"))) -> dict[str, Any]:
    with connect() as db:
        batch = row_to_dict(db.execute("SELECT * FROM import_batches WHERE id=?", (batch_id,)).fetchone())
        if not batch or batch["status"] != "待确认":
            raise HTTPException(status_code=409, detail="导入批次不存在或当前状态不能确认")
        stored = json.loads(batch["errors"])
        inserted, duplicates = 0, 0
        for row in stored.get("rows", []):
            try:
                db.execute("""INSERT INTO cases(case_number,case_name,department,category,crime,legal_cause,governance_themes,accepted_date,closed_date,status,street_status,street_name,address,keywords,summary,key_groups,key_industries,internal_transfer_status,prosecutorial_track,political_topic,political_location_factor,political_behavior_content,political_subject,political_spread_impact,political_review_status,political_risk_level,subject_name,subject_age,subject_gender,subject_occupation,subject_special_identity,source_batch_id,created_at,updated_at)
                    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (row["case_number"], row["case_name"], row["department"], row["category"], row["crime"], row["legal_cause"],
                     json.dumps(row["governance_themes"], ensure_ascii=False), row["accepted_date"], row["closed_date"], row["status"],
                     row["street_status"], row["street_name"], row["address"], row["keywords"], row["summary"],
                     json.dumps(row["key_groups"], ensure_ascii=False), json.dumps(row["key_industries"], ensure_ascii=False),
                     row["internal_transfer_status"], row["prosecutorial_track"], row["political_topic"],
                     row["political_location_factor"], row["political_behavior_content"], row["political_subject"],
                     row["political_spread_impact"], row["political_review_status"], row["political_risk_level"],
                     row["subject_name"], row["subject_age"], row["subject_gender"], row["subject_occupation"], row["subject_special_identity"],
                     batch_id, utc_now(), utc_now()))
                inserted += 1
            except Exception:
                duplicates += 1
        for subject in stored.get("subjects", []):
            case = db.execute("SELECT id FROM cases WHERE case_number=?", (subject["case_number"],)).fetchone()
            if not case:
                continue
            db.execute("""INSERT INTO case_subjects(case_id,name,age,gender,occupation,special_identity,is_resident,crime,summary,source_batch_id,created_at)
                          VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                       (case["id"], subject["name"], subject["age"], subject["gender"], subject["occupation"],
                        subject["special_identity"], subject["is_resident"], subject["crime"], subject["summary"], batch_id, utc_now()))
        db.execute("UPDATE import_batches SET status='已入库', confirmed_at=? WHERE id=?", (utc_now(), batch_id))
    write_audit(user=user, action="CONFIRM", resource_type="import_batch", resource_id=batch_id,
                detail={"inserted": inserted, "duplicates": duplicates}, client_ip=client_ip(request), success=True)
    return {"batchId": batch_id, "status": "已入库", "inserted": inserted, "duplicates": duplicates}


@app.post("/data/import/{batch_id}/replace")
def replace_import(batch_id: int, request: Request,
                   user: dict[str, Any] = Depends(require_permission("data:import"))) -> dict[str, Any]:
    with connect() as db:
        batch = row_to_dict(db.execute("SELECT * FROM import_batches WHERE id=?", (batch_id,)).fetchone())
        if not batch or batch["status"] != "待确认":
            raise HTTPException(status_code=409, detail="导入批次不存在或当前状态不能替换")
        stored = json.loads(batch["errors"])
        deleted = db.execute("DELETE FROM cases").rowcount
        inserted, duplicates = 0, 0
        for row in stored.get("rows", []):
            try:
                db.execute("""INSERT INTO cases(case_number,case_name,department,category,crime,legal_cause,governance_themes,accepted_date,closed_date,status,street_status,street_name,address,keywords,summary,key_groups,key_industries,internal_transfer_status,prosecutorial_track,political_topic,political_location_factor,political_behavior_content,political_subject,political_spread_impact,political_review_status,political_risk_level,source_batch_id,created_at,updated_at)
                    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (row["case_number"], row["case_name"], row["department"], row["category"], row["crime"], row["legal_cause"],
                     json.dumps(row["governance_themes"], ensure_ascii=False), row["accepted_date"], row["closed_date"], row["status"],
                     row["street_status"], row["street_name"], row["address"], row["keywords"], row["summary"],
                     json.dumps(row["key_groups"], ensure_ascii=False), json.dumps(row["key_industries"], ensure_ascii=False),
                     row["internal_transfer_status"], row["prosecutorial_track"], row["political_topic"],
                     row["political_location_factor"], row["political_behavior_content"], row["political_subject"],
                     row["political_spread_impact"], row["political_review_status"], row["political_risk_level"],
                     batch_id, utc_now(), utc_now()))
                inserted += 1
            except Exception:
                duplicates += 1
        for subject in stored.get("subjects", []):
            case = db.execute("SELECT id FROM cases WHERE case_number=?", (subject["case_number"],)).fetchone()
            if not case:
                continue
            db.execute("""INSERT INTO case_subjects(case_id,name,age,gender,occupation,special_identity,is_resident,crime,summary,source_batch_id,created_at)
                          VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                       (case["id"], subject["name"], subject["age"], subject["gender"], subject["occupation"],
                        subject["special_identity"], subject["is_resident"], subject["crime"], subject["summary"], batch_id, utc_now()))
        db.execute("UPDATE import_batches SET status='已替换入库', confirmed_at=? WHERE id=?", (utc_now(), batch_id))
    write_audit(user=user, action="REPLACE", resource_type="import_batch", resource_id=batch_id,
                detail={"deleted": deleted, "inserted": inserted, "duplicates": duplicates},
                client_ip=client_ip(request), success=True)
    return {"batchId": batch_id, "status": "已替换入库", "deleted": deleted, "inserted": inserted, "duplicates": duplicates}


@app.post("/data/import/{batch_id}/rollback")
def rollback_import(batch_id: int, request: Request,
                    user: dict[str, Any] = Depends(require_permission("data:rollback"))) -> dict[str, Any]:
    with connect() as db:
        batch = row_to_dict(db.execute("SELECT * FROM import_batches WHERE id=?", (batch_id,)).fetchone())
        if not batch or batch["status"] != "已入库":
            raise HTTPException(status_code=409, detail="仅已入库批次可以回滚")
        deleted = db.execute("DELETE FROM cases WHERE source_batch_id=?", (batch_id,)).rowcount
        db.execute("UPDATE import_batches SET status='已回滚' WHERE id=?", (batch_id,))
    write_audit(user=user, action="ROLLBACK", resource_type="import_batch", resource_id=batch_id,
                detail={"deleted": deleted}, client_ip=client_ip(request), success=True)
    return {"batchId": batch_id, "status": "已回滚", "deleted": deleted}


@app.post("/ai/generate")
async def ai_generate(payload: AIRequest, request: Request,
                      user: dict[str, Any] = Depends(require_permission("ai:use"))) -> dict[str, Any]:
    if payload.module == "political-security" and "political:read" not in permissions_for(user):
        raise HTTPException(status_code=403, detail="未取得政治安全专项权限")
    for case_id in payload.caseIds:
        with connect() as db:
            case = row_to_dict(db.execute("SELECT * FROM cases WHERE id=?", (case_id,)).fetchone())
        if not case or not can_read_case(user, case):
            raise HTTPException(status_code=403, detail="AI输入包含无权访问的案件")
    result = await generate(user=user, module=payload.module, prompt=payload.prompt, case_ids=payload.caseIds)
    write_audit(user=user, action="GENERATE", resource_type="ai_call", resource_id=result["callId"],
                detail={"module": payload.module, "caseIds": payload.caseIds}, client_ip=client_ip(request), success=True)
    return result


@app.get("/system-settings")
def get_settings(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    with connect() as db:
        row = db.execute("SELECT value FROM system_settings WHERE key='ui'").fetchone()
    defaults = {
        "name": settings.app_name,
        "dataScopeNotice": "仅展示已确认入库的数据",
        "modelBaseUrl": settings.model_base_url,
        "modelChatPath": settings.model_chat_path or "/chat/completions",
        "modelName": settings.model_name,
        "modelApiKey": settings.model_api_key,
        "modelTimeoutSeconds": settings.model_timeout_seconds,
        "modelFrontendTimeoutSeconds": 220,
    }
    if not row:
        return defaults
    value = json.loads(row["value"])
    return {**defaults, **value}


@app.put("/system-settings")
def save_settings(payload: SettingsPayload, request: Request,
                  user: dict[str, Any] = Depends(require_permission("system:manage"))) -> dict[str, bool]:
    value = payload.model_dump_json()
    with connect() as db:
        db.execute("INSERT INTO system_settings(key,value,updated_by,updated_at) VALUES('ui',?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=excluded.updated_at", (value, user["id"], utc_now()))
    write_audit(user=user, action="UPDATE", resource_type="system_settings", resource_id="ui", detail={}, client_ip=client_ip(request), success=True)
    return {"success": True}


def _suggestion_dict(row: dict[str, Any]) -> dict[str, Any]:
    return {"id": row["id"], "title": row["title"], "type": row["type"], "content": row["content"], "target": row["target"],
            "issueDate": row["issue_date"], "status": row["status"], "isPolitical": bool(row["is_political"]),
            "politicalCategory": row["political_category"], "builtInReference": bool(row.get("built_in_reference"))}


@app.get("/procuratorate/suggestions")
def suggestions(user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    where, params = _case_scope(user)
    del where
    with connect() as db:
        if "case:read:all" in permissions_for(user):
            rows = db.execute("SELECT * FROM suggestions ORDER BY id DESC").fetchall()
        else:
            rows = db.execute("SELECT * FROM suggestions WHERE built_in_reference=1 OR department=? ORDER BY id DESC", (user.get("department"),)).fetchall()
    return [_suggestion_dict(dict(row)) for row in rows if not row["is_political"] or "political:read" in permissions_for(user)]


@app.get("/procuratorate/suggestions/{suggestion_id}")
def suggestion_detail(suggestion_id: int, user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    with connect() as db:
        row = row_to_dict(db.execute("SELECT * FROM suggestions WHERE id=?", (suggestion_id,)).fetchone())
    if not row:
        raise HTTPException(status_code=404, detail="检察建议不存在")
    if row["is_political"] and "political:read" not in permissions_for(user):
        raise HTTPException(status_code=403, detail="未取得政治安全专项权限")
    if not row.get("built_in_reference") and "case:read:all" not in permissions_for(user) and row["department"] != user.get("department"):
        raise HTTPException(status_code=403, detail="不属于您的授权范围")
    return _suggestion_dict(row)


@app.post("/procuratorate/suggestions")
def create_suggestion(payload: SuggestionPayload, request: Request,
                      user: dict[str, Any] = Depends(require_permission("material:edit"))) -> dict[str, Any]:
    if payload.isPolitical and "political:write" not in permissions_for(user):
        raise HTTPException(status_code=403, detail="未取得政治安全专项编辑权限")
    with connect() as db:
        cursor = db.execute("INSERT INTO suggestions(title,type,content,target,issue_date,status,is_political,political_category,department,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                            (payload.title, payload.type, payload.content, payload.target, payload.issueDate, payload.status, int(payload.isPolitical), payload.politicalCategory, user.get("department"), user["id"], utc_now(), utc_now()))
        row = row_to_dict(db.execute("SELECT * FROM suggestions WHERE id=?", (cursor.lastrowid,)).fetchone())
    write_audit(user=user, action="CREATE", resource_type="suggestion", resource_id=row["id"], detail={}, client_ip=client_ip(request), success=True)
    return _suggestion_dict(row)


MONTHLY_SECTION_KEYS = ["recentChanges", "highFrequencyIssues", "keyStreets", "keyGroups", "keyIndustries", "causeAnalysis", "recommendations"]
MONTHLY_TRANSITIONS = {"生成中": {"待审核"}, "待审核": {"审核退回", "已发布"}, "审核退回": {"待审核"}, "已发布": set()}


def _monthly_report_dict(row: dict[str, Any]) -> dict[str, Any]:
    raw_sections = json.loads(row["sections"])
    sections = {key: _monthly_section_lines(raw_sections.get(key)) for key in MONTHLY_SECTION_KEYS}
    return {
        "id": row["id"], "month": row["month"], "title": row["title"], "summary": row["summary"],
        "sections": sections, "metrics": json.loads(row["metrics"]), "status": row["status"],
        "generatedByAi": bool(row["generated_by_ai"]), "updatedAt": row["updated_at"], "publishedAt": row["published_at"]
    }


def _monthly_section_lines(value: Any) -> list[str]:
    if isinstance(value, str):
        return [line.strip().lstrip("-• ") for line in value.splitlines() if line.strip()]
    if isinstance(value, list):
        return [str(line).strip() for line in value if isinstance(line, (str, int, float)) and str(line).strip()]
    return []


def _normalize_monthly_content(parsed: Any, fallback: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(parsed, dict) or not isinstance(parsed.get("sections"), dict):
        raise ValueError("月报模型结果不是有效JSON对象")
    sections = {key: _monthly_section_lines(parsed["sections"].get(key)) for key in MONTHLY_SECTION_KEYS}
    if any(not lines for lines in sections.values()):
        raise ValueError("月报模型结果缺少有效章节内容")
    return {
        "title": str(parsed.get("title") or fallback["title"]).strip(),
        "summary": str(parsed.get("summary") or fallback["summary"]).strip(),
        "sections": sections,
    }


def _parse_model_json(content: str) -> Any:
    raw = content.strip()
    start, end = raw.find("{"), raw.rfind("}")
    if start < 0 or end < start:
        raise ValueError("模型未返回JSON对象")
    return json.loads(raw[start:end + 1])


def _monthly_aggregate(month: str, user: dict[str, Any]) -> dict[str, Any]:
    scope, params = _case_scope(user)
    with connect() as db:
        rows = [dict(row) for row in db.execute(
            f"SELECT category,street_name,key_groups,key_industries,governance_themes FROM cases WHERE {scope} AND substr(COALESCE(accepted_date, created_at),1,7)=?",
            (*params, month),
        ).fetchall()]
    total = len(rows)
    def ranked(field: str, fallback: str) -> list[dict[str, Any]]:
        counts: dict[str, int] = {}
        for row in rows:
            raw = row.get(field)
            values: list[str] = []
            if raw:
                try:
                    parsed = json.loads(raw)
                    values = parsed if isinstance(parsed, list) else [str(parsed)]
                except (TypeError, ValueError):
                    values = [item.strip() for item in str(raw).replace("、", ",").split(",") if item.strip()]
            if not values and field in {"category", "street_name"}: values = [str(raw or fallback)]
            for value in values: counts[value] = counts.get(value, 0) + 1
        return [{"name": name, "value": value, "percentage": round(value * 100 / total, 1) if total else 0} for name, value in sorted(counts.items(), key=lambda item: item[1], reverse=True)[:5]]
    return {"total": total, "monthOverMonth": 0, "issues": ranked("governance_themes", "其他问题"), "streets": ranked("street_name", "待确认街道"), "groups": ranked("key_groups", "其他人群"), "industries": ranked("key_industries", "其他行业"), "trend": []}


def _fallback_monthly_content(month: str, metrics: dict[str, Any]) -> dict[str, Any]:
    def lines(key: str, empty: str) -> list[str]:
        values = metrics.get(key) or []
        return [f"{item['name']}相关事项{item['value']}件，占比{item['percentage']}%" for item in values] or [empty]
    return {
        "title": "西城区社区法治风险月度简报",
        "summary": f"{month}共汇总授权范围内风险事项{metrics['total']}件。本简报由平台依据已确认数据生成，供检察机关内部审核参考。",
        "sections": {
            "recentChanges": [f"本月汇总风险事项{metrics['total']}件，数据变化需结合上期口径人工复核"],
            "highFrequencyIssues": lines("issues", "本月暂无可归类的高发问题数据"),
            "keyStreets": lines("streets", "本月暂无已确认唯一街道归属数据"),
            "keyGroups": lines("groups", "本月暂无可用于汇总的重点人群标签"),
            "keyIndustries": lines("industries", "本月暂无可用于汇总的重点行业标签"),
            "causeAnalysis": ["原因分析需由承办检察官结合案件材料和治理背景补充审核"],
            "recommendations": ["建议围绕高频问题开展专项核验并完善跨部门协同机制", "建议持续跟踪重点街道和重点行业变化，形成闭环治理台账"]
        }
    }


@app.get("/procuratorate/monthly-reports/{month}")
def monthly_report(month: str, user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    with connect() as db:
        row = row_to_dict(db.execute("SELECT * FROM monthly_reports WHERE month=?", (month,)).fetchone())
    if not row: raise HTTPException(status_code=404, detail="该月份尚未生成月报")
    return _monthly_report_dict(row)


@app.post("/procuratorate/monthly-reports/generate")
async def generate_monthly_report(payload: MonthlyReportGenerateRequest, request: Request,
                                  user: dict[str, Any] = Depends(require_permission("material:edit"))) -> dict[str, Any]:
    metrics = _monthly_aggregate(payload.month, user)
    content = _fallback_monthly_content(payload.month, metrics)
    generated_by_ai = False
    try:
        prompt = "请根据以下脱敏汇总只输出一个JSON对象，不要Markdown代码块、解释或推理过程。必须包含title、summary和sections；sections必须包含" + ",".join(MONTHLY_SECTION_KEYS) + "，且每个章节的值必须是字符串数组。数据：" + json.dumps(metrics, ensure_ascii=False)
        result = await generate(user=user, module="monthlyReport", prompt=prompt, case_ids=[])
        parsed = _parse_model_json(result["content"])
        content = _normalize_monthly_content(parsed, content)
        generated_by_ai = True
    except (HTTPException, KeyError, ValueError, TypeError):
        pass
    now = utc_now()
    with connect() as db:
        db.execute("INSERT INTO monthly_reports(month,title,summary,sections,metrics,status,generated_by_ai,created_by,created_at,updated_at) VALUES(?,?,?,?,?,'待审核',?,?,?,?) ON CONFLICT(month) DO UPDATE SET title=excluded.title,summary=excluded.summary,sections=excluded.sections,metrics=excluded.metrics,status='待审核',generated_by_ai=excluded.generated_by_ai,updated_at=excluded.updated_at",
                   (payload.month, content["title"], content["summary"], json.dumps(content["sections"], ensure_ascii=False), json.dumps(metrics, ensure_ascii=False), int(generated_by_ai), user["id"], now, now))
        row = row_to_dict(db.execute("SELECT * FROM monthly_reports WHERE month=?", (payload.month,)).fetchone())
    write_audit(user=user, action="GENERATE", resource_type="monthly_report", resource_id=row["id"], detail={"month": payload.month, "generatedByAi": generated_by_ai}, client_ip=client_ip(request), success=True)
    return _monthly_report_dict(row)


@app.put("/procuratorate/monthly-reports/{report_id}")
def update_monthly_report(report_id: int, payload: MonthlyReportUpdateRequest, request: Request,
                          user: dict[str, Any] = Depends(require_permission("material:edit"))) -> dict[str, Any]:
    if any(not payload.sections.get(key) for key in MONTHLY_SECTION_KEYS): raise HTTPException(status_code=422, detail="月报七个章节均不能为空")
    with connect() as db:
        current = row_to_dict(db.execute("SELECT * FROM monthly_reports WHERE id=?", (report_id,)).fetchone())
        if not current: raise HTTPException(status_code=404, detail="月报不存在")
        if current["status"] == "已发布": raise HTTPException(status_code=409, detail="已发布月报不可直接修改")
        db.execute("UPDATE monthly_reports SET title=?,summary=?,sections=?,metrics=?,updated_at=? WHERE id=?", (payload.title, payload.summary, json.dumps(payload.sections, ensure_ascii=False), json.dumps(payload.metrics, ensure_ascii=False), utc_now(), report_id))
        row = row_to_dict(db.execute("SELECT * FROM monthly_reports WHERE id=?", (report_id,)).fetchone())
    write_audit(user=user, action="UPDATE", resource_type="monthly_report", resource_id=report_id, detail={}, client_ip=client_ip(request), success=True)
    return _monthly_report_dict(row)


@app.post("/procuratorate/monthly-reports/{report_id}/transition")
def transition_monthly_report(report_id: int, payload: MonthlyReportTransitionRequest, request: Request,
                              user: dict[str, Any] = Depends(require_permission("material:edit"))) -> dict[str, Any]:
    if payload.status in {"审核退回", "已发布"} and "material:publish" not in permissions_for(user):
        raise HTTPException(status_code=403, detail="未取得月报审核发布权限")
    with connect() as db:
        current = row_to_dict(db.execute("SELECT * FROM monthly_reports WHERE id=?", (report_id,)).fetchone())
        if not current: raise HTTPException(status_code=404, detail="月报不存在")
        if payload.status not in MONTHLY_TRANSITIONS[current["status"]]: raise HTTPException(status_code=409, detail="当前状态不允许执行该操作")
        published_at = utc_now() if payload.status == "已发布" else current["published_at"]
        db.execute("UPDATE monthly_reports SET status=?,reviewed_by=?,published_at=?,updated_at=? WHERE id=?", (payload.status, user["id"], published_at, utc_now(), report_id))
        row = row_to_dict(db.execute("SELECT * FROM monthly_reports WHERE id=?", (report_id,)).fetchone())
    write_audit(user=user, action="PUBLISH" if payload.status == "已发布" else "REVIEW", resource_type="monthly_report", resource_id=report_id, detail={"status": payload.status}, client_ip=client_ip(request), success=True)
    return _monthly_report_dict(row)


@app.get("/site/footer")
def site_footer() -> dict[str, Any]:
    return {"recordNo": "检察内网部署版", "links": []}


EMPTY_LIST_ENDPOINTS = [
    "/legal-recommend/recommendations",
    "/alert-push/tasks", "/effect-stats/community",
    "/effect-stats/trend", "/effect-stats/community-period", "/home/official-dynamics", "/archive/items",
    "/procuratorate/feed",
]


def _empty_list(user: dict[str, Any] = Depends(get_current_user)) -> list[Any]:
    return []


for endpoint in EMPTY_LIST_ENDPOINTS:
    app.add_api_route(endpoint, _empty_list, methods=["GET"], response_model=None)


@app.get("/procuratorate/category-distribution")
def procuratorate_category_distribution(user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, object]]:
    with connect() as db:
        return suggestion_category_distribution(db)


@app.get("/procuratorate/monthly-trend")
def procuratorate_monthly_trend(user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, object]]:
    with connect() as db:
        return suggestion_monthly_trend(db)


@app.get("/effect-stats/rates")
@app.get("/effect-stats/rates-period")
def empty_rates(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, int]:
    return {"responseRate": 0, "closeRate": 0, "reachRate": 0}


@app.get("/legal-recommend/push-stats")
def empty_push_stats(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, int]:
    with connect() as db:
        total = db.execute("SELECT COUNT(*) FROM legal_plans").fetchone()[0]
    return {"totalPlans": total, "onlinePushCount": 0, "offlineActivityCount": 0, "audienceCoverage": 0, "todayPushCommunities": 0}


def _legal_plan_dict(row: dict[str, Any], include_content: bool = False) -> dict[str, Any]:
    result = {"id": row["id"], "planId": row["id"], "title": row["title"], "group": row["audience_group"] or "未填写",
              "scene": row["scene"] or "未填写", "type": "人工维护", "tags": [row["status"]],
              "autoGenNote": "AI内容须经人工审核" if row["status"] == "待人工审核" else "人工维护",
              "coverageTarget": 0, "durationDays": 0, "approvalRate": 0, "pilotCommunities": 0, "resources": [],
              "reviewStatus": row["status"], "builtInReference": bool(row.get("built_in_reference"))}
    if include_content:
        result.update({"content": row["content"], "updatedTime": row["updated_at"], "applicableGroup": row["audience_group"],
                       "triggerScene": row["scene"], "relatedCategory": "", "riskContext": {"trendPortrait": "暂无数据", "subjectPortrait": row["audience_group"] or "暂无数据", "featureWords": "暂无数据", "riskLevel": "不自动评级"}, "legalBasis": []})
    return result


@app.get("/legal-recommend/v2/recommendations")
def legal_plan_list(user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    with connect() as db:
        if "case:read:all" in permissions_for(user):
            rows = db.execute("SELECT * FROM legal_plans ORDER BY id DESC").fetchall()
        else:
            rows = db.execute("SELECT * FROM legal_plans WHERE built_in_reference=1 OR department=? ORDER BY id DESC", (user.get("department"),)).fetchall()
    return [_legal_plan_dict(dict(row)) for row in rows]


@app.post("/legal-recommend/v2/recommendations")
def create_legal_plan(payload: LegalPlanPayload, request: Request,
                      user: dict[str, Any] = Depends(require_permission("material:edit"))) -> dict[str, Any]:
    with connect() as db:
        cursor = db.execute("INSERT INTO legal_plans(title,community,audience_group,scene,content,status,department,created_by,created_at,updated_at) VALUES(?,?,?,?,?,'待人工审核',?,?,?,?)",
                            (payload.title, payload.community, payload.group, payload.scene, payload.content, user.get("department"), user["id"], utc_now(), utc_now()))
        row = row_to_dict(db.execute("SELECT * FROM legal_plans WHERE id=?", (cursor.lastrowid,)).fetchone())
    write_audit(user=user, action="CREATE", resource_type="legal_plan", resource_id=row["id"], detail={}, client_ip=client_ip(request), success=True)
    return _legal_plan_dict(row, include_content=True)


@app.get("/legal-recommend/plans/{plan_id}")
def legal_plan_detail(plan_id: int, user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    with connect() as db:
        row = row_to_dict(db.execute("SELECT * FROM legal_plans WHERE id=?", (plan_id,)).fetchone())
    if not row:
        raise HTTPException(status_code=404, detail="普法方案不存在")
    if not row.get("built_in_reference") and "case:read:all" not in permissions_for(user) and row["department"] != user.get("department"):
        raise HTTPException(status_code=403, detail="不属于您的授权范围")
    return _legal_plan_dict(row, include_content=True)


@app.put("/legal-recommend/v2/recommendations/{plan_id}")
def update_legal_plan(plan_id: int, payload: LegalPlanPayload, request: Request,
                      user: dict[str, Any] = Depends(require_permission("material:edit"))) -> dict[str, Any]:
    with connect() as db:
        row = row_to_dict(db.execute("SELECT * FROM legal_plans WHERE id=?", (plan_id,)).fetchone())
        if not row:
            raise HTTPException(status_code=404, detail="普法方案不存在")
        if row.get("built_in_reference"):
            raise HTTPException(status_code=409, detail="正式内置基础数据不可编辑")
        if "case:read:all" not in permissions_for(user) and row["department"] != user.get("department"):
            raise HTTPException(status_code=403, detail="不属于您的授权范围")
        db.execute("UPDATE legal_plans SET title=?,community=?,audience_group=?,scene=?,content=?,status='待人工审核',updated_at=? WHERE id=?",
                   (payload.title, payload.community, payload.group, payload.scene, payload.content, utc_now(), plan_id))
        updated = row_to_dict(db.execute("SELECT * FROM legal_plans WHERE id=?", (plan_id,)).fetchone())
    write_audit(user=user, action="UPDATE", resource_type="legal_plan", resource_id=plan_id,
                detail={"status": "待人工审核"}, client_ip=client_ip(request), success=True)
    return _legal_plan_dict(updated, include_content=True)


@app.post("/legal-recommend/v2/recommendations/{plan_id}/submit-review")
def submit_legal_plan_review(plan_id: int, request: Request,
                             user: dict[str, Any] = Depends(require_permission("material:edit"))) -> dict[str, Any]:
    with connect() as db:
        row = row_to_dict(db.execute("SELECT * FROM legal_plans WHERE id=?", (plan_id,)).fetchone())
        if not row:
            raise HTTPException(status_code=404, detail="普法方案不存在")
        if row.get("built_in_reference"):
            raise HTTPException(status_code=409, detail="正式内置基础数据不可提交审核")
        if "case:read:all" not in permissions_for(user) and row["department"] != user.get("department"):
            raise HTTPException(status_code=403, detail="不属于您的授权范围")
        db.execute("UPDATE legal_plans SET status='已提交审核',updated_at=? WHERE id=?", (utc_now(), plan_id))
        updated = row_to_dict(db.execute("SELECT * FROM legal_plans WHERE id=?", (plan_id,)).fetchone())
    write_audit(user=user, action="SUBMIT_REVIEW", resource_type="legal_plan", resource_id=plan_id,
                detail={"status": "已提交审核"}, client_ip=client_ip(request), success=True)
    return _legal_plan_dict(updated, include_content=True)


@app.delete("/legal-recommend/v2/recommendations/{plan_id}")
def delete_legal_plan(plan_id: int, request: Request,
                      user: dict[str, Any] = Depends(require_permission("material:edit"))) -> dict[str, bool]:
    with connect() as db:
        row = row_to_dict(db.execute("SELECT * FROM legal_plans WHERE id=?", (plan_id,)).fetchone())
        if not row:
            raise HTTPException(status_code=404, detail="普法方案不存在")
        if row.get("built_in_reference"):
            raise HTTPException(status_code=409, detail="正式内置参考数据不可删除")
        if "case:read:all" not in permissions_for(user) and row["department"] != user.get("department"):
            raise HTTPException(status_code=403, detail="不属于您的授权范围")
        db.execute("DELETE FROM legal_plans WHERE id=?", (plan_id,))
    write_audit(user=user, action="DELETE", resource_type="legal_plan", resource_id=plan_id, detail={}, client_ip=client_ip(request), success=True)
    return {"success": True}


@app.get("/political/overview")
def political_overview(user: dict[str, Any] = Depends(require_permission("political:read"))) -> dict[str, Any]:
    where, params = _case_scope(user)
    with connect() as db:
        rows = db.execute(f"SELECT * FROM cases WHERE {where} AND political_review_status!='不属于政治安全'", params).fetchall()
        suggestions = db.execute("SELECT COUNT(*) FROM suggestions WHERE is_political=1").fetchone()[0]
    topic_counts: dict[str, int] = {}
    for row in rows:
        topics = _json_list(row["political_topic"]) or _json_list(row["governance_themes"]) or [row["political_topic"] or "未标注专题"]
        for topic in topics:
            topic_counts[topic] = topic_counts.get(topic, 0) + 1
    top_topics = "、".join(name for name, _ in sorted(topic_counts.items(), key=lambda item: item[1], reverse=True)[:3]) or "暂无已导入数据"
    pending_review = sum(1 for row in rows if row["political_review_status"] in {"待人工复核", "人工研判"})
    high_risk = sum(1 for row in rows if row["political_risk_level"] == "高风险")
    high_attention = sum(1 for row in rows if row["political_risk_level"] in {"高风险", "中风险", "关注"})
    return {
        "totalSignalsThisYear": len(rows),
        "highIncidenceTypes": top_topics,
        "riskAlertPushCount": pending_review,
        "procuratorateSuggestions": suggestions,
        "majorEventCoupling": "需人工研判" if rows else "暂无数据",
        "pendingManualReview": pending_review,
        "pendingManualReviewRate": pending_review / len(rows) if rows else 0,
        "highConcernRisks": high_attention,
        "highConcernRiskRate": high_attention / len(rows) if rows else 0,
        "highRiskCases": high_risk,
        "highRiskRate": high_risk / len(rows) if rows else 0,
        "yearOverYearRate": None,
        "fourDimensionMethod": [
            {"name": "地点维度", "description": "发生地政治属性、敏感程度与核心区属性"},
            {"name": "行为内容", "description": "言论、行为、诉求等内容是否涉及政治安全风险"},
            {"name": "涉及主体", "description": "主体身份、组织属性、背景关系与关联网络"},
            {"name": "时间维度", "description": "政治安全案件数量随时间变化的趋势"},
        ],
        "priorityTopics": ["涉外风险"],
    }


@app.get("/political/monthly-trend")
def political_monthly_trend(user: dict[str, Any] = Depends(require_permission("political:read"))) -> list[dict[str, Any]]:
    where, params = _case_scope(user)
    with connect() as db:
        rows = db.execute(f"""SELECT substr(COALESCE(NULLIF(accepted_date,''), created_at),1,7) month,COUNT(*) count
                              FROM cases WHERE {where} AND political_review_status!='不属于政治安全'
                              GROUP BY month ORDER BY month LIMIT 24""", params).fetchall()
    return [{"month": row["month"] or "未填日期", "count": row["count"]} for row in rows]


@app.get("/political/street-stats")
def political_street_stats(user: dict[str, Any] = Depends(require_permission("political:read"))) -> list[dict[str, Any]]:
    where, params = _case_scope(user)
    with connect() as db:
        rows = db.execute(f"""SELECT street_name, political_risk_level, political_review_status, COUNT(*) count
                              FROM cases WHERE {where} AND political_review_status!='不属于政治安全' AND street_status='已确认街道'
                              GROUP BY street_name, political_risk_level, political_review_status""", params).fetchall()
    grouped: dict[str, dict[str, Any]] = {}
    for row in rows:
        name = row["street_name"] or "未确认街道"
        item = grouped.setdefault(name, {
            "community": name,
            "count": 0,
            "longitude": 116.366794,
            "latitude": 39.915309,
            "riskLevel": row["political_risk_level"] or "关注",
            "reviewStatus": row["political_review_status"] or "待人工复核",
        })
        item["count"] += row["count"]
        if row["political_risk_level"] == "高风险":
            item["riskLevel"] = "高风险"
    return list(grouped.values())


@app.get("/risk-analysis/scoring-config")
def disabled_scoring(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, int]:
    return {"highThreshold": 0, "mediumThreshold": 0}


@app.put("/risk-analysis/scoring-config")
def reject_scoring(user: dict[str, Any] = Depends(require_permission("system:manage"))) -> None:
    raise HTTPException(status_code=410, detail="生产版已停用高中低风险自动评分")


@app.put("/procuratorate/suggestions/{suggestion_id}")
def update_suggestion(suggestion_id: int, payload: SuggestionPayload, request: Request,
                      user: dict[str, Any] = Depends(require_permission("material:edit"))) -> dict[str, Any]:
    with connect() as db:
        current = row_to_dict(db.execute("SELECT * FROM suggestions WHERE id=?", (suggestion_id,)).fetchone())
        if not current:
            raise HTTPException(status_code=404, detail="检察建议不存在")
        if current.get("built_in_reference"):
            raise HTTPException(status_code=409, detail="正式内置基础数据不可编辑")
        if "case:read:all" not in permissions_for(user) and current["department"] != user.get("department"):
            raise HTTPException(status_code=403, detail="不属于您的授权范围")
        if (current["is_political"] or payload.isPolitical) and "political:write" not in permissions_for(user):
            raise HTTPException(status_code=403, detail="未取得政治安全专项编辑权限")
        db.execute("UPDATE suggestions SET title=?,type=?,content=?,target=?,issue_date=?,status=?,is_political=?,political_category=?,updated_at=? WHERE id=?",
                   (payload.title, payload.type, payload.content, payload.target, payload.issueDate, payload.status,
                    int(payload.isPolitical), payload.politicalCategory, utc_now(), suggestion_id))
        updated = row_to_dict(db.execute("SELECT * FROM suggestions WHERE id=?", (suggestion_id,)).fetchone())
    write_audit(user=user, action="UPDATE", resource_type="suggestion", resource_id=suggestion_id,
                detail={}, client_ip=client_ip(request), success=True)
    return _suggestion_dict(updated)


@app.post("/procuratorate/suggestions/{suggestion_id}/ignore")
def ignore_suggestion(suggestion_id: int, request: Request,
                      user: dict[str, Any] = Depends(require_permission("material:edit"))) -> dict[str, bool]:
    with connect() as db:
        current = row_to_dict(db.execute("SELECT * FROM suggestions WHERE id=?", (suggestion_id,)).fetchone())
        if not current:
            raise HTTPException(status_code=404, detail="检察建议不存在")
        if current.get("built_in_reference"):
            raise HTTPException(status_code=409, detail="正式内置参考数据不可删除或忽略")
        if "case:read:all" not in permissions_for(user) and current["department"] != user.get("department"):
            raise HTTPException(status_code=403, detail="不属于您的授权范围")
        db.execute("UPDATE suggestions SET status='已驳回',updated_at=? WHERE id=?", (utc_now(), suggestion_id))
    write_audit(user=user, action="IGNORE", resource_type="suggestion", resource_id=suggestion_id,
                detail={}, client_ip=client_ip(request), success=True)
    return {"success": True}
