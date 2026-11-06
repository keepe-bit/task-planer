import unittest
import os
import tempfile
from pathlib import Path

# Set up test database before imports
tmp_dir = tempfile.mkdtemp()
test_db_path = str(Path(tmp_dir) / "test_planner.db")
os.environ["TASK_PLANNER_DB_PATH"] = test_db_path

from backend.database import init_database
from backend.security import hash_password, verify_password
from backend.services.user_service import create_user, block_user, unblock_user, get_user_by_username
from backend.services.auth_service import authenticate_user
from backend.services.task_service import create_task, update_task, get_task_by_id
from backend.services.audit_service import list_audit_logs


class TestBackendLogic(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_database()

    def test_01_password_hashing(self):
        pwd = "SecureP@ssw0rd2026!"
        h = hash_password(pwd)
        self.assertTrue(h.startswith("pbkdf2_sha256$"))
        self.assertTrue(verify_password(pwd, h))
        self.assertFalse(verify_password("WrongPassword", h))

    def test_02_task_creation_and_auto_counter(self):
        admin = get_user_by_username("admin")
        self.assertIsNotNone(admin)
        
        task1 = create_task(
            title="Тестовая задача 1",
            description="Описание 1",
            priority="high",
            assignee_id=None,
            actor=admin
        )
        self.assertTrue("/" in task1.number)
        self.assertEqual(task1.title, "Тестовая задача 1")

        # Regular user cannot create tasks
        operator = get_user_by_username("operator")
        with self.assertRaises(PermissionError):
            create_task(
                title="Недопустимая задача",
                description="Тест",
                priority="low",
                assignee_id=None,
                actor=operator
            )

    def test_03_task_update_and_audit(self):
        admin = get_user_by_username("admin")
        operator = get_user_by_username("operator")
        
        task = create_task(
            title="Задача для изменения статуса",
            description="Исходное описание",
            priority="medium",
            assignee_id=operator.id,
            actor=admin
        )

        # Operator updates status to in_progress
        updated = update_task(task.id, {"status": "in_progress"}, actor=operator)
        self.assertEqual(updated.status, "in_progress")

        # Operator attempts to change priority (should fail with PermissionError)
        with self.assertRaises(PermissionError):
            update_task(task.id, {"priority": "critical"}, actor=operator)

        # Audit logs should contain STATUS_CHANGED
        logs = list_audit_logs(task_id=task.id)
        self.assertTrue(any(l["action"] in ("STATUS_CHANGED", "TASK_UPDATED") for l in logs))

    def test_04_user_blocking(self):
        user = create_user("testblocker", "Secret1234!", "Тест Блокировки", role="user")
        # Can login before block
        res = authenticate_user("testblocker", "Secret1234!")
        self.assertIn("token", res)

        # Block user
        block_user("testblocker")
        with self.assertRaises(PermissionError):
            authenticate_user("testblocker", "Secret1234!")

        # Unblock user
        unblock_user("testblocker")
        res_after = authenticate_user("testblocker", "Secret1234!")
        self.assertIn("token", res_after)


if __name__ == "__main__":
    unittest.main()
