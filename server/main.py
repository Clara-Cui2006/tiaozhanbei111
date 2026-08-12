from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from .ai import generate
from .auth import (can_read_case, client_ip, get_current_user, permissions_for,
                   public_user, require_permission)
from .config import settings
from .database import connect, init_database, row_to_dict, utc_now, write_audit
from .importer import parse_import
from .schemas import (AIRequest, ChangePasswordRequest, LegalPlanPayload,
                      LoginRequest, MonthlyReportGenerateRequest,
                      MonthlyReportTransitionRequest, MonthlyReportUpdateRequest,
                      SettingsPayload, SuggestionPayload, UserCreate)
from .security import create_token, hash_password, verify_password
from .reference_materials import suggestion_category_distribution, suggestion_monthly_trend

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
    return {"status": "ok", "database": "connected", "model": "configured" if settings.model_base_url else "not_configured"}


@app.post("/auth/login")
def login(payload: LoginRequest, request: Request) -> dict[str, Any]:
    with connect() as db:
        user = row_to_dict(db.execute("SELECT * FROM users WHERE username=?", (payload.username,)).fetchone())
        if user and user.get("locked_until"):
            try:
                if datetime.fromisoformat(user["locked_until"]) > datetime.now(timezone.utc):
                    write_audit(user=user, action="LOGIN", resource_type="session", resource_id=None,
                                detail={"reason": "locked"}, client_ip=client_ip(request), success=False)
                    raise HTTPException(status_code=429, detail="登录失败次数过多，请稍后重试")
            except ValueError:
                pass
        if not user or not user["active"] or not verify_password(payload.password, user["password_hash"]):
            if user:
                attempts = int(user["failed_attempts"]) + 1
                locked_until = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat() if attempts >= 5 else None
                db.execute("UPDATE users SET failed_attempts=?, locked_until=? WHERE id=?", (0 if locked_until else attempts, locked_until, user["id"]))
                db.commit()
            write_audit(user=user, action="LOGIN", resource_type="session", resource_id=None,
                        detail={"reason": "invalid_credentials"}, client_ip=client_ip(request), success=False)
            raise HTTPException(status_code=401, detail="用户名或密码错误")
        db.execute("UPDATE users SET failed_attempts=0, locked_until=NULL WHERE id=?", (user["id"],))
    token = create_token(int(user["id"]), int(user["session_version"]))
    write_audit(user=user, action="LOGIN", resource_type="session", resource_id=None,
                detail={}, client_ip=client_ip(request), success=True)
    return {"accessToken": token, "tokenType": "bearer", "expiresIn": settings.token_ttl_minutes * 60, "user": public_user(user)}


@app.get("/auth/me")
def me(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return public_user(user)


@app.post("/auth/logout")
def logout(request: Request, user: dict[str, Any] = Depends(get_current_user)) -> dict[str, bool]:
    with connect() as db:
        db.execute("UPDATE users SET session_version=session_version+1 WHERE id=?", (user["id"],))
    write_audit(user=user, action="LOGOUT", resource_type="session", resource_id=None, detail={}, client_ip=client_ip(request), success=True)
    return {"success": True}


@app.post("/auth/change-password")
def change_password(payload: ChangePasswordRequest, request: Request,
                    user: dict[str, Any] = Depends(get_current_user)) -> dict[str, bool]:
    if not verify_password(payload.currentPassword, user["password_hash"]):
        write_audit(user=user, action="CHANGE_PASSWORD", resource_type="user", resource_id=user["id"],
                    detail={"reason": "current_password_invalid"}, client_ip=client_ip(request), success=False)
        raise HTTPException(status_code=400, detail="当前密码不正确")
    with connect() as db:
        db.execute("UPDATE users SET password_hash=?,session_version=session_version+1 WHERE id=?",
                   (hash_password(payload.newPassword), user["id"]))
    write_audit(user=user, action="CHANGE_PASSWORD", resource_type="user", resource_id=user["id"],
                detail={}, client_ip=client_ip(request), success=True)
    return {"success": True}


@app.get("/users")
def list_users(user: dict[str, Any] = Depends(require_permission("user:manage"))) -> list[dict[str, Any]]:
    with connect() as db:
        rows = db.execute("SELECT * FROM users ORDER BY id").fetchall()
    return [{**public_user(dict(row)), "active": bool(row["active"])} for row in rows]


@app.post("/users")
def create_user(payload: UserCreate, request: Request,
                user: dict[str, Any] = Depends(require_permission("user:manage"))) -> dict[str, Any]:
    if payload.role in {"ordinary", "department_supervisor"} and not payload.department:
        raise HTTPException(status_code=422, detail="普通用户和部门主管必须绑定业务条线")
    with connect() as db:
        try:
            cursor = db.execute(
                "INSERT INTO users(username,display_name,password_hash,role,department,permissions,created_at) VALUES(?,?,?,?,?,?,?)",
                (payload.username, payload.displayName, hash_password(payload.password), payload.role, payload.department,
                 json.dumps(payload.permissions, ensure_ascii=False), utc_now()),
            )
        except Exception as exc:
            raise HTTPException(status_code=409, detail="用户名已存在或数据不符合要求") from exc
        created = row_to_dict(db.execute("SELECT * FROM users WHERE id=?", (cursor.lastrowid,)).fetchone())
    write_audit(user=user, action="CREATE", resource_type="user", resource_id=created["id"],
                detail={"role": payload.role, "department": payload.department}, client_ip=client_ip(request), success=True)
    return public_user(created)


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


@app.get("/risk-analysis/case-details")
def case_list(keyword: str | None = None, category: str | None = None,
              user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    where, params = _case_scope(user)
    clauses, values = [where], list(params)
    if keyword:
        clauses.append("(case_name LIKE ? OR case_number LIKE ? OR keywords LIKE ?)")
        values.extend([f"%{keyword}%"] * 3)
    if category:
        clauses.append("category=?")
        values.append(category)
    with connect() as db:
        rows = db.execute(f"SELECT * FROM cases WHERE {' AND '.join(clauses)} ORDER BY accepted_date DESC LIMIT 500", values).fetchall()
    return [{"id": r["id"], "caseName": r["case_name"], "procedureType": r["status"] or "",
             "caseNumber": r["case_number"], "keywords": r["keywords"] or "", "judgmentReason": r["summary"] or "",
             "category": r["category"], "legalCause": r["legal_cause"] or r["crime"] or r["category"],
             "governanceThemes": _json_list(r["governance_themes"])} for r in rows]


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


@app.get("/dashboard/overview")
def dashboard_overview(user: dict[str, Any] = Depends(require_permission("dashboard:read"))) -> dict[str, Any]:
    where, params = _case_scope(user)
    with connect() as db:
        total = db.execute(f"SELECT COUNT(*) FROM cases WHERE {where}", params).fetchone()[0]
        top = db.execute(f"SELECT category,COUNT(*) AS c FROM cases WHERE {where} GROUP BY category ORDER BY c DESC LIMIT 1", params).fetchone()
        suggestions = db.execute("SELECT COUNT(*) FROM suggestions").fetchone()[0]
    return {"totalCasesThisYear": total, "highIncidenceTypes": top["category"] if top else "暂无数据",
            "riskAlertPushCount": 0, "procuratorateSuggestions": suggestions, "legalPushCount": 0}


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
    cases = [dict(row) for row in case_rows]
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
        "momChangeCount": None,
        "momRate": None,
        "yoyChangeCount": None,
        "yoyRate": None,
        "topCaseTypes": [{"name": r["name"] or "未填", "count": r["count"], "rate": (r["count"] / total if total else 0)} for r in categories],
        "topGovernanceIssues": [{"name": name, "count": count} for name, count in sorted(theme_counts.items(), key=lambda item: item[1], reverse=True)[:5]],
        "keyGroups": [{"label": name, "count": count} for name, count in sorted(group_counts.items(), key=lambda item: item[1], reverse=True)[:5]],
        "keyIndustries": [{"name": name, "count": count} for name, count in sorted(industry_counts.items(), key=lambda item: item[1], reverse=True)[:5]],
        "subjectBreakdown": _top_counts(cases, "political_subject", "未标注主体")[:6],
        "behaviorBreakdown": _top_counts(cases, "political_behavior_content", "未标注行为")[:6],
        "timeTrend": [{"period": row["month"] or "未填日期", "count": row["count"]} for row in trend_rows],
        "newRisks": [],
        "transferClues": {"count": sum(r["count"] for r in transfer_rows if r["internal_transfer_status"] != "未形成线索"), "statusSummary": transfer_summary, "canViewDetails": False},
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
             json.dumps({"errors": parsed.errors, "rows": parsed.rows}, ensure_ascii=False), user["id"], utc_now()),
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
        db.execute("UPDATE import_batches SET status='已入库', confirmed_at=? WHERE id=?", (utc_now(), batch_id))
    write_audit(user=user, action="CONFIRM", resource_type="import_batch", resource_id=batch_id,
                detail={"inserted": inserted, "duplicates": duplicates}, client_ip=client_ip(request), success=True)
    return {"batchId": batch_id, "status": "已入库", "inserted": inserted, "duplicates": duplicates}


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


@app.get("/audit-logs")
def audit_logs(limit: int = 100, user: dict[str, Any] = Depends(require_permission("audit:read"))) -> list[dict[str, Any]]:
    with connect() as db:
        rows = db.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?", (min(max(limit, 1), 500),)).fetchall()
    return [dict(row) for row in rows]


@app.get("/system-settings")
def get_settings(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    with connect() as db:
        row = db.execute("SELECT value FROM system_settings WHERE key='ui'").fetchone()
    return json.loads(row["value"]) if row else {"name": settings.app_name, "dataScopeNotice": "仅展示已确认入库的数据"}


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
    return {
        "id": row["id"], "month": row["month"], "title": row["title"], "summary": row["summary"],
        "sections": json.loads(row["sections"]), "metrics": json.loads(row["metrics"]), "status": row["status"],
        "generatedByAi": bool(row["generated_by_ai"]), "updatedAt": row["updated_at"], "publishedAt": row["published_at"]
    }


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
        prompt = "请根据以下脱敏汇总生成月报JSON，必须包含title、summary和sections；sections必须包含" + ",".join(MONTHLY_SECTION_KEYS) + "。数据：" + json.dumps(metrics, ensure_ascii=False)
        result = await generate(user=user, module="monthlyReport", prompt=prompt, case_ids=[])
        raw = result["content"].strip().removeprefix("```json").removesuffix("```").strip()
        parsed = json.loads(raw)
        if all(key in parsed.get("sections", {}) for key in MONTHLY_SECTION_KEYS):
            content = parsed
            generated_by_ai = True
    except (HTTPException, ValueError, TypeError):
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
    "/dashboard/risk-trend", "/dashboard/community-risk-points", "/dashboard/multi-trend",
    "/risk-analysis/events", "/risk-analysis/case-categories", "/risk-analysis/case-subjects",
    "/risk-analysis/case-time-trends", "/risk-analysis/case-feature-words", "/legal-recommend/recommendations",
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
