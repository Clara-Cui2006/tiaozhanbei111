import unittest

from server.ai import extract_final_content


class AiResponseTests(unittest.TestCase):
    def test_removes_embedded_thinking_and_keeps_final_answer(self):
        message = {
            "reasoning_content": "独立思考过程",
            "content": "<think>嵌入的思考过程</think>最终普法方案",
        }
        self.assertEqual(extract_final_content(message), "最终普法方案")


if __name__ == "__main__":
    unittest.main()
