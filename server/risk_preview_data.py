from __future__ import annotations

import json
import sqlite3
from typing import Any

from .database import utc_now

PREVIEW_BATCH_FILENAME = "risk-analysis-preview.json"

_SEEDS = (
    ("邻里与社区治理", "侵犯公民人身权利、民主权利罪", "故意伤害罪", "邻里矛盾", "新街口街道"),
    ("邻里与社区治理", "侵犯财产罪", "盗窃罪", "社区财物安全", "德胜街道"),
    ("邻里与社区治理", "妨害社会管理秩序罪", "寻衅滋事罪", "噪声扰民", "白纸坊街道"),
    ("民生权益保障", "侵犯财产罪", "诈骗罪", "养老消费", "月坛街道"),
    ("民生权益保障", "破坏社会主义市场经济秩序罪", "生产、销售伪劣产品罪", "消费维权", "展览路街道"),
    ("民生权益保障", "侵犯公民人身权利、民主权利罪", "拒不支付劳动报酬罪", "欠薪保障", "广安门外街道"),
    ("公共安全治理", "危害公共安全罪", "危险驾驶罪", "交通安全", "金融街街道"),
    ("公共安全治理", "妨害社会管理秩序罪", "重大责任事故罪", "消防隐患", "什刹海街道"),
    ("公共安全治理", "破坏社会主义市场经济秩序罪", "生产、销售不符合安全标准的产品罪", "设施安全", "西长安街街道"),
    ("生态环境与市容治理", "妨害社会管理秩序罪", "污染环境罪", "违法排污", "大栅栏街道"),
    ("生态环境与市容治理", "危害公共安全罪", "失火罪", "绿地防火", "天桥街道"),
    ("生态环境与市容治理", "破坏社会主义市场经济秩序罪", "非法经营罪", "建筑垃圾", "椿树街道"),
    ("市场秩序与企业经营", "破坏社会主义市场经济秩序罪", "虚开增值税专用发票罪", "企业合规", "金融街街道"),
    ("市场秩序与企业经营", "侵犯财产罪", "职务侵占罪", "企业财产", "月坛街道"),
    ("市场秩序与企业经营", "贪污贿赂罪", "行贿罪", "营商环境", "西长安街街道"),
    ("刑事犯罪与社会治安", "侵犯财产罪", "盗窃罪", "侵财犯罪", "广安门内街道"),
    ("刑事犯罪与社会治安", "妨害社会管理秩序罪", "帮助信息网络犯罪活动罪", "网络犯罪", "牛街街道"),
    ("刑事犯罪与社会治安", "危害国家安全罪", "为境外非法提供国家秘密罪", "国家安全", "陶然亭街道"),
)

PREVIEW_CASES: list[dict[str, Any]] = []
for index, (theme, chapter, crime, keyword, street) in enumerate(_SEEDS, start=1):
    PREVIEW_CASES.append({
        "case_number": f"PREVIEW-RISK-{index:03d}", "case_name": f"风险大盘预览案件{index:02d}",
        "department": "预览数据专用", "category": chapter, "crime": crime, "legal_cause": crime,
        "governance_themes": [theme], "accepted_date": f"2026-{((index - 1) % 6) + 1:02d}-{10 + index % 10:02d}",
        "closed_date": "", "status": "已办结", "street_status": "已确认街道", "street_name": street,
        "address": f"{street}预览地址", "keywords": f"{keyword},风险预览", "summary": f"用于展示{theme}的数据接口联动。",
        "key_groups": ["社区居民" if index % 3 else "老年人"], "key_industries": ["基层治理"],
        "internal_transfer_status": "纳入统计", "prosecutorial_track": "风险分析",
        "subject_name": f"预览{index:02d}某", "subject_age": 22 + index * 2,
        "subject_gender": "男" if index % 2 else "女", "subject_occupation": "社区居民",
        "subject_special_identity": "老年人" if 22 + index * 2 >= 60 else "无",
    })


def clear_preview_cases(db: sqlite3.Connection) -> int:
    batch_ids = [row[0] for row in db.execute("SELECT id FROM import_batches WHERE filename=?", (PREVIEW_BATCH_FILENAME,))]
    deleted = 0
    for batch_id in batch_ids:
        deleted += db.execute("DELETE FROM cases WHERE source_batch_id=?", (batch_id,)).rowcount
    db.execute("DELETE FROM import_batches WHERE filename=?", (PREVIEW_BATCH_FILENAME,))
    return deleted


def seed_preview_cases(db: sqlite3.Connection, imported_by: int) -> tuple[int, int]:
    existing = db.execute("SELECT COUNT(*) FROM cases WHERE case_number LIKE 'PREVIEW-RISK-%'").fetchone()[0]
    if existing:
        return 0, existing
    now = utc_now()
    cursor = db.execute(
        "INSERT INTO import_batches(filename,file_sha256,status,total_rows,valid_rows,error_rows,errors,imported_by,created_at,confirmed_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
        (PREVIEW_BATCH_FILENAME, "preview-risk-analysis-v1", "已入库", len(PREVIEW_CASES), len(PREVIEW_CASES), 0, "[]", imported_by, now, now),
    )
    batch_id = cursor.lastrowid
    columns = ("case_number", "case_name", "department", "category", "crime", "legal_cause", "governance_themes", "accepted_date", "closed_date", "status", "street_status", "street_name", "address", "keywords", "summary", "key_groups", "key_industries", "internal_transfer_status", "prosecutorial_track", "subject_name", "subject_age", "subject_gender", "subject_occupation", "subject_special_identity", "source_batch_id", "created_at", "updated_at")
    placeholders = ",".join("?" for _ in columns)
    for row in PREVIEW_CASES:
        values = []
        for column in columns:
            value = row.get(column)
            if column in {"governance_themes", "key_groups", "key_industries"}:
                value = json.dumps(value or [], ensure_ascii=False)
            elif column == "source_batch_id":
                value = batch_id
            elif column in {"created_at", "updated_at"}:
                value = now
            values.append(value)
        db.execute(f"INSERT INTO cases({','.join(columns)}) VALUES({placeholders})", values)
    return len(PREVIEW_CASES), 0
