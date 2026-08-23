from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=256)


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
    modelBaseUrl: str = Field(default="", max_length=500)
    modelChatPath: str = Field(default="/chat/completions", max_length=300)
    modelName: str = Field(default="", max_length=200)
    modelApiKey: str = Field(default="", max_length=500)
    modelTimeoutSeconds: float = Field(default=60, ge=1, le=600)
    modelFrontendTimeoutSeconds: float = Field(default=220, ge=2, le=630)

    @model_validator(mode="after")
    def validate_model_timeout_order(self) -> "SettingsPayload":
        if self.modelFrontendTimeoutSeconds <= self.modelTimeoutSeconds:
            raise ValueError("前端等待时间必须大于后端模型等待时间")
        return self


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


class MonthlyReportGenerateRequest(BaseModel):
    month: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")


class MonthlyReportUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    summary: str = Field(min_length=1, max_length=5000)
    sections: dict[str, list[str]]
    metrics: dict[str, Any]


class MonthlyReportTransitionRequest(BaseModel):
    status: Literal["待审核", "审核退回", "已发布"]
