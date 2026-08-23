import unittest

from pydantic import ValidationError

from server.schemas import SettingsPayload


class SettingsPayloadTests(unittest.TestCase):
    def test_frontend_timeout_must_exceed_backend_timeout(self):
        with self.assertRaises(ValidationError):
            SettingsPayload(modelTimeoutSeconds=200, modelFrontendTimeoutSeconds=200)


if __name__ == "__main__":
    unittest.main()
