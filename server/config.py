from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    app_name: str = "西城区社区法治风险预警平台"
    environment: str = os.getenv("APP_ENV", "development")
    database_path: Path = Path(os.getenv("DATABASE_PATH", "./var/platform.db")).resolve()
    jwt_secret: str = os.getenv("JWT_SECRET", "")
    token_ttl_minutes: int = int(os.getenv("TOKEN_TTL_MINUTES", "30"))
    model_base_url: str = os.getenv("MODEL_BASE_URL", "").rstrip("/")
    model_api_key: str = os.getenv("MODEL_API_KEY", "")
    model_name: str = os.getenv("MODEL_NAME", "")
    model_chat_path: str = os.getenv("MODEL_CHAT_PATH", "/chat/completions")
    model_timeout_seconds: float = float(os.getenv("MODEL_TIMEOUT_SECONDS", "60"))
    bootstrap_username: str = os.getenv("BOOTSTRAP_ADMIN_USERNAME", "admin")
    bootstrap_password: str = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "")

    @property
    def production(self) -> bool:
        return self.environment.lower() == "production"

    def validate(self) -> None:
        if self.production and len(self.jwt_secret) < 32:
            raise RuntimeError("生产环境 JWT_SECRET 必须至少为 32 个字符")
        if self.production and self.database_path.name == "platform.db" and not self.database_path.is_absolute():
            raise RuntimeError("生产环境必须显式设置 DATABASE_PATH")


settings = Settings()
