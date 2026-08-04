from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .database import connect, row_to_dict
from .security import decode_token

bearer = HTTPBearer(auto_error=False)

ROLE_DEFAULT_PERMISSIONS: dict[str, set[str]] = {
    "ordinary": {"dashboard:read", "case:read:department", "ai:use"},
    "department_supervisor": {"dashboard:read", "case:read:all", "ai:use", "material:edit"},
    "leadership": {"dashboard:read", "case:read:all", "decision:read", "audit:summary"},
    "data_admin": {"dashboard:read", "data:import", "data:rollback", "case:read:metadata"},
    "system_admin": {"dashboard:read", "user:manage", "system:manage", "audit:read"},
}


def permissions_for(user: dict[str, Any]) -> set[str]:
    extra = json.loads(user.get("permissions") or "[]")
    return ROLE_DEFAULT_PERMISSIONS.get(user["role"], set()) | set(extra)


def public_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user["id"],
        "username": user["username"],
        "displayName": user["display_name"],
        "role": user["role"],
        "department": user["department"],
        "permissions": sorted(permissions_for(user)),
    }


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> dict[str, Any]:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录")
    try:
        claims = decode_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    with connect() as db:
        user = row_to_dict(db.execute("SELECT * FROM users WHERE id=? AND active=1", (int(claims["sub"]),)).fetchone())
    if not user or int(user["session_version"]) != int(claims["sv"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录凭证已失效")
    return user


def require_permission(permission: str) -> Callable[..., dict[str, Any]]:
    def dependency(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        if permission not in permissions_for(user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权执行该操作")
        return user
    return dependency


def can_read_case(user: dict[str, Any], case: dict[str, Any]) -> bool:
    permissions = permissions_for(user)
    if "case:read:all" in permissions:
        return True
    return "case:read:department" in permissions and user.get("department") == case.get("department")


def client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None
