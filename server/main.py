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
                      LoginRequest, SettingsPayload, SuggestionPayload, UserCreate)
from .security import create_token, hash_password, verify_password

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
             "category": r["category"]} for r in rows]


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
            "judgmentReason": "" if metadata_only else (case["summary"] or ""), "category": case["category"]}


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
def street_overview(user: dict[str, Any] = Depends(require_permission("dashboard:read"))) -> dict[str, Any]:
    where, params = _case_scope(user)
    with connect() as db:
        rows = db.execute(f"SELECT street_name,COUNT(*) count FROM cases WHERE {where} AND street_status='已确认街道' GROUP BY street_name", params).fetchall()
        pending = db.execute(f"SELECT street_status,COUNT(*) count FROM cases WHERE {where} AND street_status!='已确认街道' GROUP BY street_status", params).fetchall()
    return {"streets": [{"streetName": r["street_name"], "caseCount": r["count"]} for r in rows],
            "unassigned": {r["street_status"]: r["count"] for r in pending}, "updatedAt": utc_now(), "dataBatch": "正式业务库"}


@app.get("/dashboard/street-map/detail")
def street_detail(streetName: str, user: dict[str, Any] = Depends(require_permission("dashboard:read"))) -> dict[str, Any]:
    where, params = _case_scope(user)
    with connect() as db:
        total = db.execute(f"SELECT COUNT(*) FROM cases WHERE {where} AND street_status='已确认街道' AND street_name=?", (*params, streetName)).fetchone()[0]
        categories = db.execute(f"SELECT category,COUNT(*) count FROM cases WHERE {where} AND street_name=? GROUP BY category ORDER BY count DESC", (*params, streetName)).fetchall()
    return {"streetName": streetName, "caseCount": total, "highFrequencyCategories": [{"name": r["category"], "value": r["count"]} for r in categories],
            "governanceIssues": [], "keyAttention": [], "notice": "仅展示经人工确认街道归属的事实统计"}


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
                db.execute("""INSERT INTO cases(case_number,case_name,department,category,crime,accepted_date,closed_date,status,street_status,street_name,address,keywords,summary,source_batch_id,created_at,updated_at)
                    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (row["case_number"], row["case_name"], row["department"], row["category"], row["crime"], row["accepted_date"], row["closed_date"], row["status"], row["street_status"], row["street_name"], row["address"], row["keywords"], row["summary"], batch_id, utc_now(), utc_now()))
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
            "politicalCategory": row["political_category"]}


@app.get("/procuratorate/suggestions")
def suggestions(user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    where, params = _case_scope(user)
    del where
    with connect() as db:
        if "case:read:all" in permissions_for(user):
            rows = db.execute("SELECT * FROM suggestions ORDER BY id DESC").fetchall()
        else:
            rows = db.execute("SELECT * FROM suggestions WHERE department=? ORDER BY id DESC", (user.get("department"),)).fetchall()
    return [_suggestion_dict(dict(row)) for row in rows if not row["is_political"] or "political:read" in permissions_for(user)]


@app.get("/procuratorate/suggestions/{suggestion_id}")
def suggestion_detail(suggestion_id: int, user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    with connect() as db:
        row = row_to_dict(db.execute("SELECT * FROM suggestions WHERE id=?", (suggestion_id,)).fetchone())
    if not row:
        raise HTTPException(status_code=404, detail="检察建议不存在")
    if row["is_political"] and "political:read" not in permissions_for(user):
        raise HTTPException(status_code=403, detail="未取得政治安全专项权限")
    if "case:read:all" not in permissions_for(user) and row["department"] != user.get("department"):
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


@app.get("/site/footer")
def site_footer() -> dict[str, Any]:
    return {"recordNo": "检察内网部署版", "links": []}


EMPTY_LIST_ENDPOINTS = [
    "/dashboard/risk-trend", "/dashboard/community-risk-points", "/dashboard/multi-trend",
    "/risk-analysis/events", "/risk-analysis/case-categories", "/risk-analysis/case-subjects",
    "/risk-analysis/case-time-trends", "/risk-analysis/case-feature-words", "/legal-recommend/recommendations",
    "/alert-push/tasks", "/effect-stats/community",
    "/effect-stats/trend", "/effect-stats/community-period", "/home/official-dynamics", "/archive/items",
    "/procuratorate/feed", "/procuratorate/monthly-trend", "/procuratorate/category-distribution",
    "/political/monthly-trend", "/political/street-stats",
]


def _empty_list(user: dict[str, Any] = Depends(get_current_user)) -> list[Any]:
    return []


for endpoint in EMPTY_LIST_ENDPOINTS:
    app.add_api_route(endpoint, _empty_list, methods=["GET"], response_model=None)


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
              "coverageTarget": 0, "durationDays": 0, "approvalRate": 0, "pilotCommunities": 0, "resources": []}
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
            rows = db.execute("SELECT * FROM legal_plans WHERE department=? ORDER BY id DESC", (user.get("department"),)).fetchall()
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
    if "case:read:all" not in permissions_for(user) and row["department"] != user.get("department"):
        raise HTTPException(status_code=403, detail="不属于您的授权范围")
    return _legal_plan_dict(row, include_content=True)


@app.delete("/legal-recommend/v2/recommendations/{plan_id}")
def delete_legal_plan(plan_id: int, request: Request,
                      user: dict[str, Any] = Depends(require_permission("material:edit"))) -> dict[str, bool]:
    with connect() as db:
        row = row_to_dict(db.execute("SELECT * FROM legal_plans WHERE id=?", (plan_id,)).fetchone())
        if not row:
            raise HTTPException(status_code=404, detail="普法方案不存在")
        if "case:read:all" not in permissions_for(user) and row["department"] != user.get("department"):
            raise HTTPException(status_code=403, detail="不属于您的授权范围")
        db.execute("DELETE FROM legal_plans WHERE id=?", (plan_id,))
    write_audit(user=user, action="DELETE", resource_type="legal_plan", resource_id=plan_id, detail={}, client_ip=client_ip(request), success=True)
    return {"success": True}


@app.get("/political/overview")
def political_overview(user: dict[str, Any] = Depends(require_permission("political:read"))) -> dict[str, Any]:
    return {"totalSignalsThisYear": 0, "highIncidenceTypes": "暂无已导入数据", "riskAlertPushCount": 0,
            "procuratorateSuggestions": 0, "majorEventCoupling": "暂无数据"}


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
        if "case:read:all" not in permissions_for(user) and current["department"] != user.get("department"):
            raise HTTPException(status_code=403, detail="不属于您的授权范围")
        db.execute("UPDATE suggestions SET status='已驳回',updated_at=? WHERE id=?", (utc_now(), suggestion_id))
    write_audit(user=user, action="IGNORE", resource_type="suggestion", resource_id=suggestion_id,
                detail={}, client_ip=client_ip(request), success=True)
    return {"success": True}
