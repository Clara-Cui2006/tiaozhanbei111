import sqlite3
import unittest

from server.reference_materials import (
    LEGAL_PLANS,
    SUGGESTIONS,
    seed_reference_materials,
    suggestion_category_distribution,
    suggestion_monthly_trend,
)


SCHEMA = """
CREATE TABLE suggestions (
 id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, type TEXT NOT NULL,
 content TEXT NOT NULL, target TEXT NOT NULL, issue_date TEXT NOT NULL,
 status TEXT NOT NULL, is_political INTEGER NOT NULL DEFAULT 0,
 political_category TEXT, department TEXT, created_by INTEGER NOT NULL,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 source_key TEXT UNIQUE, built_in_reference INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE legal_plans (
 id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, community TEXT,
 audience_group TEXT, scene TEXT, content TEXT NOT NULL, status TEXT NOT NULL,
 department TEXT, created_by INTEGER NOT NULL, created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL, source_key TEXT UNIQUE,
 built_in_reference INTEGER NOT NULL DEFAULT 0
);
"""


class ReferenceMaterialSeedTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        self.db.executescript(SCHEMA)

    def tearDown(self):
        self.db.close()

    def test_seeds_all_reference_materials_as_non_mock_records(self):
        seed_reference_materials(self.db, "2026-08-12T00:00:00+00:00")
        suggestions = self.db.execute("SELECT * FROM suggestions").fetchall()
        plans = self.db.execute("SELECT * FROM legal_plans").fetchall()
        self.assertEqual(len(suggestions), len(SUGGESTIONS))
        self.assertEqual(len(plans), len(LEGAL_PLANS))
        self.assertTrue(all(row["built_in_reference"] == 1 for row in suggestions + plans))
        self.assertTrue(all(row["is_political"] == 0 for row in suggestions))
        self.assertNotIn("【填写说明】", {row["title"] for row in suggestions + plans})

    def test_reseeding_is_idempotent_and_preserves_manual_edits(self):
        seed_reference_materials(self.db, "2026-08-12T00:00:00+00:00")
        key = SUGGESTIONS[0]["source_key"]
        self.db.execute("UPDATE suggestions SET status='人工复核中' WHERE source_key=?", (key,))
        seed_reference_materials(self.db, "2026-08-13T00:00:00+00:00")
        row = self.db.execute("SELECT status FROM suggestions WHERE source_key=?", (key,)).fetchone()
        self.assertEqual(row["status"], "人工复核中")
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM suggestions").fetchone()[0], len(SUGGESTIONS))

    def test_aggregates_reference_suggestions_for_charts(self):
        seed_reference_materials(self.db, "2026-08-12T00:00:00+00:00")
        self.assertEqual(
            suggestion_category_distribution(self.db),
            [
                {"name": "公益诉讼检察", "value": 9},
                {"name": "刑事检察", "value": 3},
                {"name": "民事检察", "value": 2},
            ],
        )
        self.assertEqual(
            suggestion_monthly_trend(self.db),
            [
                {"month": "2025-02", "count": 1},
                {"month": "2025-03", "count": 1},
                {"month": "2025-05", "count": 1},
                {"month": "2025-06", "count": 1},
                {"month": "2025-08", "count": 2},
            ],
        )


if __name__ == "__main__":
    unittest.main()
