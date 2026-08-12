from __future__ import annotations

import unittest
import json
import sqlite3

from server.importer import parse_import
from server.database import SCHEMA
from server.risk_analysis import (
    GOVERNANCE_CATEGORIES,
    build_case_categories,
    build_case_feature_words,
    build_case_subjects,
    build_case_time_trends,
    filter_cases_by_category,
)
from server.risk_preview_data import PREVIEW_CASES, clear_preview_cases, seed_preview_cases


SAMPLE_ROWS = [
    {
        "id": 1, "category": "侵犯财产罪", "governance_themes": '["邻里与社区治理"]',
        "accepted_date": "2026-01-10", "created_at": "2026-01-10T00:00:00",
        "keywords": "邻里纠纷,财产损失", "key_groups": '["老年人"]', "key_industries": '[]',
        "subject_name": "甲某", "subject_age": 61, "subject_gender": "男", "subject_occupation": "退休人员",
        "subject_special_identity": "老年人", "crime": "盗窃罪", "summary": "邻里财物纠纷",
    },
    {
        "id": 2, "category": "危害公共安全罪", "governance_themes": '["公共安全治理", "邻里与社区治理"]',
        "accepted_date": "2026-02-12", "created_at": "2026-02-12T00:00:00",
        "keywords": "消防隐患,公共安全", "key_groups": '[]', "key_industries": '["物业服务"]',
        "subject_name": "乙某", "subject_age": 38, "subject_gender": "女", "subject_occupation": "物业人员",
        "subject_special_identity": "无", "crime": "危险驾驶罪", "summary": "公共安全隐患",
    },
]


class RiskAnalysisAggregationTest(unittest.TestCase):
    def test_preview_data_covers_all_six_categories_with_eighteen_cases(self):
        self.assertEqual(len(PREVIEW_CASES), 18)
        covered = {theme for row in PREVIEW_CASES for theme in row["governance_themes"]}
        self.assertEqual(covered, set(GOVERNANCE_CATEGORIES))
        self.assertTrue(all(row["case_number"].startswith("PREVIEW-RISK-") for row in PREVIEW_CASES))

    def test_preview_seed_is_idempotent_and_clear_is_scoped(self):
        db = sqlite3.connect(":memory:")
        db.executescript(SCHEMA)
        inserted, existing = seed_preview_cases(db, 1)
        self.assertEqual((inserted, existing), (18, 0))
        self.assertEqual(seed_preview_cases(db, 1), (0, 18))
        db.execute("INSERT INTO cases(case_number,case_name,department,category,created_at,updated_at) VALUES(?,?,?,?,?,?)",
                   ("REAL-001", "正式案件", "第一检察部", "侵犯财产罪", "2026-01-01", "2026-01-01"))
        self.assertEqual(clear_preview_cases(db), 18)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM cases WHERE case_number='REAL-001'").fetchone()[0], 1)

    def test_imports_optional_subject_fields(self):
        content = json.dumps([{
            "案件编号": "TEST-001", "案件名称": "测试案件", "业务条线": "第一检察部",
            "案件类别": "侵犯财产罪", "治理主题标签": "邻里与社区治理",
            "当事人姓名": "甲某", "当事人年龄": "61", "当事人性别": "男",
            "当事人职业": "退休人员", "特殊身份": "老年人",
        }], ensure_ascii=False).encode()
        row = parse_import("cases.json", content).rows[0]
        self.assertEqual(row["subject_name"], "甲某")
        self.assertEqual(row["subject_age"], 61)
        self.assertEqual(row["subject_gender"], "男")
        self.assertEqual(row["subject_occupation"], "退休人员")
        self.assertEqual(row["subject_special_identity"], "老年人")

    def test_builds_six_governance_categories_and_criminal_law_children(self):
        result = build_case_categories(SAMPLE_ROWS)
        self.assertEqual([item["name"] for item in result], list(GOVERNANCE_CATEGORIES))
        self.assertEqual(result[0]["value"], 2)
        self.assertEqual({child["name"]: child["value"] for child in result[0]["children"]}, {
            "侵犯财产罪": 1, "危害公共安全罪": 1,
        })

    def test_filters_cases_by_governance_category_or_exact_chapter(self):
        self.assertEqual([row["id"] for row in filter_cases_by_category(SAMPLE_ROWS, "公共安全治理")], [2])
        self.assertEqual([row["id"] for row in filter_cases_by_category(SAMPLE_ROWS, "侵犯财产罪")], [1])

    def test_builds_subjects_trends_and_feature_words_from_imported_fields(self):
        rows = filter_cases_by_category(SAMPLE_ROWS, "邻里与社区治理")
        self.assertEqual(build_case_subjects(rows)[0], {
            "id": 1, "name": "甲某", "age": 61, "gender": "男", "occupation": "退休人员",
            "specialIdentity": "老年人", "isResident": True, "crime": "盗窃罪", "summary": "邻里财物纠纷",
        })
        self.assertEqual(build_case_time_trends(rows), [
            {"period": "2026-01", "count": 1, "category": "邻里与社区治理"},
            {"period": "2026-02", "count": 1, "category": "邻里与社区治理"},
        ])
        words = {item["name"]: item["value"] for item in build_case_feature_words(rows)}
        self.assertEqual(words["公共安全"], 1)
        self.assertEqual(words["老年人"], 1)
        self.assertEqual(words["物业服务"], 1)


if __name__ == "__main__":
    unittest.main()
