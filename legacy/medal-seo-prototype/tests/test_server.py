"""
Integration tests for server.py auth, validation, and shared locks.

Usage: python tests/test_server.py
"""
import os
import sys
import types
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ["DEEPSEEK_API_KEY"] = "test-key"
os.environ["VISION_MODEL_NAME"] = "mock-vision"
os.environ["VISION_API_KEY"] = "mock-vision-key"
os.environ["VISION_BASE_URL"] = "https://mock.api/v1"
os.environ["API_TOKEN"] = "test-bearer-token-12345"
os.environ["MODEL_NAME"] = "deepseek-chat"
os.environ["LOCALAPPDATA"] = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    ".tmp",
    "localappdata",
)
os.makedirs(os.environ["LOCALAPPDATA"], exist_ok=True)

_crew = types.ModuleType("crew")
_crew.run_seo_pipeline = lambda **kwargs: {}
sys.modules["crew"] = _crew

import server


class TestAuthMiddleware(unittest.TestCase):
    def setUp(self):
        server.app.config["TESTING"] = True
        self.client = server.app.test_client()
        self.auth_header = {"Authorization": "Bearer test-bearer-token-12345"}

    def test_generate_without_auth_returns_401(self):
        resp = self.client.post("/api/generate", json={"keyword": "test"})
        self.assertEqual(resp.status_code, 401)
        self.assertEqual(resp.get_json()["error"], "Unauthorized")

    def test_generate_with_wrong_token_returns_401(self):
        resp = self.client.post(
            "/api/generate",
            headers={"Authorization": "Bearer wrong-token"},
            json={"keyword": "test"},
        )
        self.assertEqual(resp.status_code, 401)

    def test_index_does_not_require_auth(self):
        resp = self.client.get("/")
        self.assertNotEqual(resp.status_code, 401)

    def test_knowledge_get_does_not_require_auth(self):
        resp = self.client.get("/api/knowledge/categories")
        self.assertNotEqual(resp.status_code, 401)

    def test_knowledge_put_requires_auth(self):
        resp = self.client.put("/api/knowledge/category/test", json={})
        self.assertEqual(resp.status_code, 401)

    def test_knowledge_delete_requires_auth(self):
        resp = self.client.delete("/api/knowledge/category/test")
        self.assertEqual(resp.status_code, 401)


class TestGenerateValidation(unittest.TestCase):
    def setUp(self):
        server.app.config["TESTING"] = True
        self.client = server.app.test_client()
        self.headers = {
            "Authorization": "Bearer test-bearer-token-12345",
            "Content-Type": "application/json",
        }

    def test_missing_keyword_returns_400(self):
        resp = self.client.post(
            "/api/generate",
            headers=self.headers,
            json={"customer_type": "corporate", "material": "zinc alloy", "images": []},
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("keyword", resp.get_json().get("error", ""))

    def test_missing_customer_type_returns_400(self):
        resp = self.client.post(
            "/api/generate",
            headers=self.headers,
            json={"keyword": "medals", "material": "zinc alloy", "images": []},
        )
        self.assertEqual(resp.status_code, 400)

    def test_missing_images_returns_400(self):
        resp = self.client.post(
            "/api/generate",
            headers=self.headers,
            json={
                "keyword": "medals",
                "customer_type": "corporate",
                "material": "zinc alloy",
                "images": [],
            },
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("image", resp.get_json().get("error", "").lower())

    def test_keyword_too_long_returns_400(self):
        resp = self.client.post(
            "/api/generate",
            headers=self.headers,
            json={
                "keyword": "x" * 201,
                "customer_type": "corp",
                "material": "zinc",
                "images": ["data:image/png;base64,abc"],
            },
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("exceeds", resp.get_json().get("error", ""))


class TestTaskEndpoint(unittest.TestCase):
    def setUp(self):
        server.app.config["TESTING"] = True
        self.client = server.app.test_client()

    def test_unknown_task_returns_404(self):
        resp = self.client.get("/api/task/nonexistent123")
        self.assertEqual(resp.status_code, 404)

    def test_known_task_returns_status(self):
        with server.tasks_lock:
            server.tasks["test-task-001"] = {
                "status": "queued",
                "progress": {},
                "created_at": 0,
                "keyword": "test",
                "customer_type": "corp",
                "material": "zinc",
                "notes": "",
                "image_count": 1,
                "temp_files": [],
            }
        resp = self.client.get("/api/task/test-task-001")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json()["status"], "queued")
        with server.tasks_lock:
            server.tasks.pop("test-task-001", None)


class TestLocks(unittest.TestCase):
    def test_history_lock_exists(self):
        self.assertTrue(hasattr(server, "_history_lock"))

    def test_articles_lock_exists(self):
        self.assertTrue(hasattr(server, "_articles_lock"))

    def test_knowledge_lock_exists(self):
        self.assertTrue(hasattr(server, "_knowledge_lock"))

    def test_batch_store_lock_exists(self):
        self.assertTrue(hasattr(server, "batch_store_lock"))


if __name__ == "__main__":
    unittest.main()
