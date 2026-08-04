from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=256)


class UserCreate(BaseModel):
    username: str = Field(pattern=r"^[A-Za-z0-9_.-]{3,64}$")
    displayName: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=12, max_length=256)
    role: Literal["ordinary", "department_supervisor", "leadership", "data_admin", "system_admin"]
    department: str | None = Field(default=None, max_length=64)
    permissions: list[str] = []


class AIRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=20_000)
    module: str = Field(default="general", max_length=64)
    caseIds: list[int] = Field(default_factory=list, max_length=100)


class ChangePasswordRequest(BaseModel):
    currentPassword: str = Field(min_length=1, max_length=256)
    newPassword: str = Field(min_length=12, max_length=256)


class LegalPlanPayload(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    community: str = Field(default="", max_length=100)
    group: str = Field(default="", max_length=100)
    scene: str = Field(default="", max_length=500)
    content: str = Field(min_length=1, max_length=100_000)


class SettingsPayload(BaseModel):
    name: str = Field(default="西城区社区法治风险预警平台", max_length=100)
    dataScopeNotice: str = Field(default="仅展示已确认入库的数据", max_length=200)


class SuggestionPayload(BaseModel):
    title: str
    type: str
    content: str
    target: str
    issueDate: str
    status: str
    isPolitical: bool = False
    politicalCategory: str | None = None


class ImportConfirmRequest(BaseModel):
    batchId: int


class GenericRecord(BaseModel):
    data: dict[str, Any]
