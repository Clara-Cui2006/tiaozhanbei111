from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any

import httpx
from fastapi import HTTPException

from .config import settings
from .database import connect, utc_now

SYSTEM_PROMPTS: dict[str, str] = {
    "general": "你是检察机关内部的法治分析辅助工具。仅根据提供材料生成草稿，不作案件定性或最终决策。",
    "dashboard": "你是治理态势分析助手。只归纳事实和统计特征，不生成风险等级，不替代检察官判断。",
    "riskAnalysis": "你是案件治理特征分析助手。只归纳事实和统计特征，不生成风险等级，不替代检察官判断。",
    "caseDetail": "你是案件材料分析助手。只基于输入材料归纳，不作最终法律判断。",
    "procuratorate": "你是检察建议草稿辅助工具。输出必须注明需要检察官人工审核。",
    "legalPlan": "你是精准普法方案草稿辅助工具。不得虚构事实、法律依据或数据。",
    "effectStats": "你是治理成效归纳助手。没有数据支撑时必须明确说明暂无数据。",
    "political-security": "你是政治安全专项材料辅助工具。严格按最小必要原则处理材料，结果仅供内部人工研判。",
}

@dataclass(frozen=True)
class RuntimeModelSettings:
    base_url: str
    chat_path: str
    api_key: str
    model_name: str
    timeout_seconds: float


def _clean_text(value: Any) -> str:
    return str(value or "").strip()


def get_runtime_model_settings() -> RuntimeModelSettings:
    model_base_url = settings.model_base_url
    model_chat_path = settings.model_chat_path or "/chat/completions"
    model_api_key = settings.model_api_key
    model_name = settings.model_name
    model_timeout_seconds = settings.model_timeout_seconds

    try:
        with connect() as db:
            row = db.execute("SELECT value FROM system_settings WHERE key='ui'").fetchone()
        if row:
            value = json.loads(row["value"])
            model_base_url = _clean_text(value.get("modelBaseUrl")) or model_base_url
            model_chat_path = _clean_text(value.get("modelChatPath")) or model_chat_path
            model_api_key = _clean_text(value.get("modelApiKey")) or model_api_key
            model_name = _clean_text(value.get("modelName")) or model_name
            raw_timeout = value.get("modelTimeoutSeconds")
            if raw_timeout not in (None, ""):
                model_timeout_seconds = float(raw_timeout)
    except (json.JSONDecodeError, TypeError, ValueError):
        pass

    return RuntimeModelSettings(
        base_url=model_base_url.rstrip("/"),
        chat_path=model_chat_path,
        api_key=model_api_key,
        model_name=model_name,
        timeout_seconds=max(1, min(float(model_timeout_seconds), 600)),
    )


def build_chat_completions_url(runtime: RuntimeModelSettings) -> str:
    base_url = runtime.base_url.rstrip("/")
    chat_path = runtime.chat_path.strip()

    if not chat_path:
      chat_path = "/chat/completions"
    if chat_path.startswith("http://") or chat_path.startswith("https://"):
        return chat_path

    normalized_path = "/" + chat_path.lstrip("/")
    if base_url.endswith(normalized_path):
        return base_url
    return f"{base_url}{normalized_path}"


async def generate(*, user: dict[str, Any], module: str, prompt: str, case_ids: list[int]) -> dict[str, Any]:
    runtime = get_runtime_model_settings()
    if not runtime.base_url or not runtime.model_name:
        raise HTTPException(status_code=503, detail="院内统一模型尚未配置")

    digest = hashlib.sha256(prompt.encode("utf-8")).hexdigest()
    with connect() as db:
        cursor = db.execute(
            "INSERT INTO ai_calls(user_id,module,case_ids,input_sha256,status,created_at) VALUES(?,?,?,?,?,?)",
            (user["id"], module, json.dumps(case_ids), digest, "处理中", utc_now()),
        )
        call_id = int(cursor.lastrowid)

    headers = {"Content-Type": "application/json"}
    if runtime.api_key:
        headers["Authorization"] = f"Bearer {runtime.api_key}"
    payload = {
        "model": runtime.model_name,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPTS.get(module, SYSTEM_PROMPTS["general"])},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
    }
    try:
        chat_url = build_chat_completions_url(runtime)
        async with httpx.AsyncClient(timeout=runtime.timeout_seconds, trust_env=False) as client:
            response = await client.post(chat_url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
        content = str(data["choices"][0]["message"]["content"])
        with connect() as db:
            db.execute("UPDATE ai_calls SET output=?, status='待人工审核' WHERE id=?", (content, call_id))
        return {"content": content, "callId": call_id, "reviewStatus": "待人工审核", "notice": "AI辅助生成，未经人工审核"}
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
        with connect() as db:
            db.execute("UPDATE ai_calls SET status='失败', error_message=? WHERE id=?", (str(exc)[:500], call_id))
        raise HTTPException(status_code=502, detail="院内模型调用失败，请联系管理员检查模型服务") from exc
