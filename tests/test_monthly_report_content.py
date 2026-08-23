import unittest

from server.main import MONTHLY_SECTION_KEYS, _normalize_monthly_content


class MonthlyReportContentTests(unittest.TestCase):
    def test_normalizes_string_sections_to_line_arrays(self):
        parsed = {
            "title": "月报",
            "summary": "摘要",
            "sections": {key: f"{key}内容" for key in MONTHLY_SECTION_KEYS},
        }
        normalized = _normalize_monthly_content(parsed, parsed)
        self.assertTrue(all(isinstance(value, list) for value in normalized["sections"].values()))
        self.assertEqual(normalized["sections"]["recentChanges"], ["recentChanges内容"])


if __name__ == "__main__":
    unittest.main()
