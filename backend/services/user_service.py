import datetime
from typing import Optional, List, Dict, Any
from backend.database import get_db
from backend.models import User
from backend.security import hash_password
from backend.services.audit_service import record_audit


def _row_to_user(row: Any) -> User:
    return User(
        id=row["id"],
        username=row["username"],
        password_hash=row["password_hash"],
        full_name=row["full_name"],
        role=row["role"],
        is_blocked=bool(row["is_blocked"]),
        created_at=row["created_at"]
    )


def create_user(
    username: str,
    password: str,
    full_name: str,
    role: str = "user",
    actor: Optional[User] = None
) -> User:
    username = username.strip().lower()
    full_name = full_name.strip()
    if not username or len(username) < 3:
        raise ValueError("Имя пользователя должно содержать не менее 3 символов")
    if not password or len(password) < 6:
        raise ValueError("Пароль должен содержать не менее 6 символов")
    if role not in ("admin", "user"):
        raise ValueError("Роль должна быть 'admin' или 'user'")

    pwd_hash = hash_password(password)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
        if cursor.fetchone():
            raise ValueError(f"Пользователь с логином '{username}' уже существует")

        cursor.execute("""
            INSERT INTO users (username, password_hash, full_name, role, is_blocked, created_at)
            VALUES (?, ?, ?, ?, 0, ?)
        """, (username, pwd_hash, full_name, role, now))
        user_id = cursor.lastrowid

    actor_id = actor.id if actor else None
    actor_name = actor.username if actor else "cli/system"
    actor_role = actor.role if actor else "admin"

    record_audit(
        action="USER_CREATED",
        details=f"Создана учетная запись '{username}' ({full_name}), роль: {role}",
        user_id=actor_id,
        username=actor_name,
        user_role=actor_role
    )

    return get_user_by_id(user_id)  # type: ignore


def get_user_by_id(user_id: int) -> Optional[User]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        return _row_to_user(row) if row else None


def get_user_by_username(username: str) -> Optional[User]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ?", (username.strip().lower(),))
        row = cursor.fetchone()
        return _row_to_user(row) if row else None


def list_users() -> List[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, full_name, role, is_blocked, created_at FROM users ORDER BY id ASC")
        rows = cursor.fetchall()
        return [
            {
                "id": r["id"],
                "username": r["username"],
                "full_name": r["full_name"],
                "role": r["role"],
                "is_blocked": bool(r["is_blocked"]),
                "created_at": r["created_at"]
            }
            for r in rows
        ]


def block_user(username: str, actor: Optional[User] = None) -> bool:
    target = get_user_by_username(username)
    if not target:
        raise ValueError(f"Пользователь '{username}' не найден")
    if target.role == "admin" and actor and actor.id == target.id:
        raise ValueError("Нельзя заблокировать собственную учетную запись администратора")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET is_blocked = 1 WHERE id = ?", (target.id,))
        # Invalidate active sessions
        cursor.execute("DELETE FROM sessions WHERE user_id = ?", (target.id,))

    actor_id = actor.id if actor else None
    actor_name = actor.username if actor else "cli/system"
    actor_role = actor.role if actor else "admin"

    record_audit(
        action="USER_BLOCKED",
        details=f"Учетная запись '{target.username}' заблокирована",
        user_id=actor_id,
        username=actor_name,
        user_role=actor_role
    )
    return True


def unblock_user(username: str, actor: Optional[User] = None) -> bool:
    target = get_user_by_username(username)
    if not target:
        raise ValueError(f"Пользователь '{username}' не найден")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET is_blocked = 0 WHERE id = ?", (target.id,))

    actor_id = actor.id if actor else None
    actor_name = actor.username if actor else "cli/system"
    actor_role = actor.role if actor else "admin"

    record_audit(
        action="USER_UNBLOCKED",
        details=f"Учетная запись '{target.username}' разблокирована",
        user_id=actor_id,
        username=actor_name,
        user_role=actor_role
    )
    return True


def delete_user(username: str, actor: Optional[User] = None) -> bool:
    target = get_user_by_username(username)
    if not target:
        raise ValueError(f"Пользователь '{username}' не найден")
    if target.role == "admin" and actor and actor.id == target.id:
        raise ValueError("Нельзя удалить собственную учетную запись администратора")

    with get_db() as conn:
        cursor = conn.cursor()
        # Check if user has created tasks; if so, prevent foreign key violation or handle safely
        cursor.execute("SELECT COUNT(*) AS cnt FROM tasks WHERE created_by_id = ?", (target.id,))
        created_cnt = cursor.fetchone()["cnt"]
        if created_cnt > 0:
            # Reassign or block instead of orphan
            cursor.execute("UPDATE tasks SET assignee_id = NULL WHERE assignee_id = ?", (target.id,))
            cursor.execute("DELETE FROM sessions WHERE user_id = ?", (target.id,))
            cursor.execute("DELETE FROM users WHERE id = ?", (target.id,))
        else:
            cursor.execute("UPDATE tasks SET assignee_id = NULL WHERE assignee_id = ?", (target.id,))
            cursor.execute("DELETE FROM sessions WHERE user_id = ?", (target.id,))
            cursor.execute("DELETE FROM users WHERE id = ?", (target.id,))

    actor_id = actor.id if actor else None
    actor_name = actor.username if actor else "cli/system"
    actor_role = actor.role if actor else "admin"

    record_audit(
        action="USER_DELETED",
        details=f"Учетная запись '{target.username}' удалена",
        user_id=actor_id,
        username=actor_name,
        user_role=actor_role
    )
    return True


def set_user_role(username: str, new_role: str, actor: Optional[User] = None) -> bool:
    if new_role not in ("admin", "user"):
        raise ValueError("Роль должна быть 'admin' или 'user'")
    target = get_user_by_username(username)
    if not target:
        raise ValueError(f"Пользователь '{username}' не найден")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET role = ? WHERE id = ?", (new_role, target.id,))

    actor_id = actor.id if actor else None
    actor_name = actor.username if actor else "cli/system"
    actor_role = actor.role if actor else "admin"

    record_audit(
        action="USER_ROLE_CHANGED",
        details=f"Роль пользователя '{target.username}' изменена: {target.role} -> {new_role}",
        user_id=actor_id,
        username=actor_name,
        user_role=actor_role
    )
    return True


def reset_user_password(username: str, new_password: str, actor: Optional[User] = None) -> bool:
    if not new_password or len(new_password) < 6:
        raise ValueError("Новый пароль должен содержать не менее 6 символов")
    target = get_user_by_username(username)
    if not target:
        raise ValueError(f"Пользователь '{username}' не найден")

    pwd_hash = hash_password(new_password)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (pwd_hash, target.id))
        cursor.execute("DELETE FROM sessions WHERE user_id = ?", (target.id,))

    actor_id = actor.id if actor else None
    actor_name = actor.username if actor else "cli/system"
    actor_role = actor.role if actor else "admin"

    record_audit(
        action="PASSWORD_RESET",
        details=f"Сброшен пароль пользователя '{target.username}', сессии сброшены",
        user_id=actor_id,
        username=actor_name,
        user_role=actor_role
    )
    return True
