from __future__ import annotations

import hashlib
import json
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


async def generate(*, user: dict[str, Any], module: str, prompt: str, case_ids: list[int]) -> dict[str, Any]:
    if not settings.model_base_url or not settings.model_name:
        raise HTTPException(status_code=503, detail="院内统一模型尚未配置")

    digest = hashlib.sha256(prompt.encode("utf-8")).hexdigest()
    with connect() as db:
        cursor = db.execute(
            "INSERT INTO ai_calls(user_id,module,case_ids,input_sha256,status,created_at) VALUES(?,?,?,?,?,?)",
            (user["id"], module, json.dumps(case_ids), digest, "处理中", utc_now()),
        )
        call_id = int(cursor.lastrowid)

    headers = {"Content-Type": "application/json"}
    if settings.model_api_key:
        headers["Authorization"] = f"Bearer {settings.model_api_key}"
    payload = {
        "model": settings.model_name,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPTS.get(module, SYSTEM_PROMPTS["general"])},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
    }
    try:
        async with httpx.AsyncClient(timeout=settings.model_timeout_seconds, trust_env=False) as client:
            response = await client.post(f"{settings.model_base_url}/chat/completions", headers=headers, json=payload)
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
