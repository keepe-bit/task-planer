import sqlite3
import datetime
from contextlib import contextmanager
from typing import Generator
from backend.config import DB_PATH
from backend.security import hash_password


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_database() -> None:
    with get_db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
            is_blocked INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS task_counters (
            period TEXT PRIMARY KEY,
            current_count INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            number TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('new', 'in_progress', 'review', 'completed', 'cancelled')),
            priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high', 'critical')),
            assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_by_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
            task_number TEXT,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            username TEXT NOT NULL,
            user_role TEXT NOT NULL,
            action TEXT NOT NULL,
            details TEXT NOT NULL,
            timestamp TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_tasks_number ON tasks(number);
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
        CREATE INDEX IF NOT EXISTS idx_audit_task_id ON audit_logs(task_id);
        CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
        """)

        # Seed initial admin and operator user if users table is empty
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS cnt FROM users")
        if cursor.fetchone()["cnt"] == 0:
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            
            admin_pwd = hash_password("AdminPass123!")
            operator_pwd = hash_password("UserPass123!")
            analyst_pwd = hash_password("UserPass123!")

            cursor.execute("""
                INSERT INTO users (username, password_hash, full_name, role, is_blocked, created_at)
                VALUES (?, ?, ?, ?, 0, ?)
            """, ("admin", admin_pwd, "Системный Администратор", "admin", now))
            admin_id = cursor.lastrowid

            cursor.execute("""
                INSERT INTO users (username, password_hash, full_name, role, is_blocked, created_at)
                VALUES (?, ?, ?, ?, 0, ?)
            """, ("operator", operator_pwd, "Алексей Смирнов (Оператор)", "user", now))
            operator_id = cursor.lastrowid

            cursor.execute("""
                INSERT INTO users (username, password_hash, full_name, role, is_blocked, created_at)
                VALUES (?, ?, ?, ?, 0, ?)
            """, ("analyst", analyst_pwd, "Елена Воронова (Инженер)", "user", now))
            analyst_id = cursor.lastrowid

            # Seed initial period counter and sample tasks
            dt_now = datetime.datetime.now(datetime.timezone.utc)
            period = dt_now.strftime("%m-%Y")
            
            cursor.execute("INSERT INTO task_counters (period, current_count) VALUES (?, ?)", (period, 3))
            
            t1_num = f"001/{period}"
            cursor.execute("""
                INSERT INTO tasks (number, title, description, status, priority, assignee_id, created_by_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                t1_num,
                "Настройка сетевого маршрутизатора в ЦОД-1",
                "Необходимо обновить прошивку маршрутизатора до версии 4.2.1 и настроить резервный канал связи.",
                "in_progress",
                "high",
                operator_id,
                admin_id,
                now,
                now
            ))
            t1_id = cursor.lastrowid

            t2_num = f"002/{period}"
            cursor.execute("""
                INSERT INTO tasks (number, title, description, status, priority, assignee_id, created_by_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                t2_num,
                "Аудит безопасности учетных записей БД",
                "Проверить сроки действия паролей сервисных учетных записей PostgreSQL и настроить ротацию ключей.",
                "review",
                "critical",
                analyst_id,
                admin_id,
                now,
                now
            ))
            t2_id = cursor.lastrowid

            t3_num = f"003/{period}"
            cursor.execute("""
                INSERT INTO tasks (number, title, description, status, priority, assignee_id, created_by_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                t3_num,
                "Замена жестких дисков в массиве RAID 10",
                "Плановая замена двух накопителей в сервере резервного копирования перед архивацией.",
                "new",
                "medium",
                operator_id,
                admin_id,
                now,
                now
            ))
            t3_id = cursor.lastrowid

            # Initial audit logs
            cursor.execute("""
                INSERT INTO audit_logs (task_id, task_number, user_id, username, user_role, action, details, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (t1_id, t1_num, admin_id, "admin", "admin", "TASK_CREATED", "Создана задача №" + t1_num, now))

            cursor.execute("""
                INSERT INTO audit_logs (task_id, task_number, user_id, username, user_role, action, details, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (t2_id, t2_num, admin_id, "admin", "admin", "TASK_CREATED", "Создана задача №" + t2_num, now))

            cursor.execute("""
                INSERT INTO audit_logs (task_id, task_number, user_id, username, user_role, action, details, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (t3_id, t3_num, admin_id, "admin", "admin", "TASK_CREATED", "Создана задача №" + t3_num, now))
