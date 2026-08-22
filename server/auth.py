from __future__ import annotations

from collections.abc import Callable
from typing import Any

from fastapi import Depends, Request

DEV_ALL_PERMISSIONS = {
    "dashboard:read",
    "case:read:department",
    "case:read:all",
    "case:read:metadata",
    "case:write:department",
    "case:write:all",
    "political:read",
    "political:write",
    "data:import",
    "data:rollback",
    "ai:use",
    "material:edit",
    "material:publish",
    "decision:read",
    "audit:summary",
    "audit:read",
    "user:manage",
    "system:manage",
}


def permissions_for(user: dict[str, Any]) -> set[str]:
    return DEV_ALL_PERMISSIONS


def public_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user["id"],
        "username": user["username"],
        "displayName": user["display_name"],
        "role": user["role"],
        "department": user["department"],
        "permissions": sorted(permissions_for(user)),
    }


LOCAL_USER: dict[str, Any] = {
    "id": 0,
    "username": "local",
    "display_name": "本地用户",
    "role": "system_admin",
    "department": None,
    "permissions": "[]",
    "session_version": 0,
}


def get_current_user() -> dict[str, Any]:
    """Return the built-in local actor; this deployment intentionally has no login gate."""
    return LOCAL_USER


def require_permission(permission: str) -> Callable[..., dict[str, Any]]:
    def dependency(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        return user
    return dependency


def can_read_case(user: dict[str, Any], case: dict[str, Any]) -> bool:
    return True


def client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None
