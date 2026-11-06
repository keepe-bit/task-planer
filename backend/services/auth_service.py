import datetime
from typing import Optional, Dict, Any
from backend.database import get_db
from backend.models import User
from backend.security import verify_password, generate_session_token
from backend.config import SESSION_TTL_HOURS
from backend.services.audit_service import record_audit
from backend.services.user_service import get_user_by_username, _row_to_user


def authenticate_user(username: str, password: str) -> Dict[str, Any]:
    username = username.strip().lower()
    user = get_user_by_username(username)

    if not user:
        record_audit(
            action="LOGIN_FAILED",
            details=f"Неудачная попытка входа: пользователь '{username}' не найден",
            username=username,
            user_role="unknown"
        )
        raise ValueError("Неверное имя пользователя или пароль")

    if user.is_blocked:
        record_audit(
            action="LOGIN_BLOCKED",
            details=f"Попытка входа заблокированного пользователя '{username}'",
            user_id=user.id,
            username=user.username,
            user_role=user.role
        )
        raise PermissionError("Учетная запись заблокирована администратором")

    if not verify_password(password, user.password_hash):
        record_audit(
            action="LOGIN_FAILED",
            details=f"Неудачная попытка входа: неверный пароль для '{username}'",
            user_id=user.id,
            username=user.username,
            user_role=user.role
        )
        raise ValueError("Неверное имя пользователя или пароль")

    # Generate session token with TTL
    token = generate_session_token()
    now_dt = datetime.datetime.now(datetime.timezone.utc)
    expires_dt = now_dt + datetime.timedelta(hours=SESSION_TTL_HOURS)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO sessions (token, user_id, expires_at, created_at)
            VALUES (?, ?, ?, ?)
        """, (token, user.id, expires_dt.isoformat(), now_dt.isoformat()))

    record_audit(
        action="LOGIN_SUCCESS",
        details=f"Успешный вход в систему: '{user.username}' (Роль: {user.role})",
        user_id=user.id,
        username=user.username,
        user_role=user.role
    )

    return {
        "token": token,
        "user": user.to_safe_dict(),
        "expires_at": expires_dt.isoformat()
    }


def get_user_from_token(token: str) -> Optional[User]:
    if not token or not isinstance(token, str):
        return None

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT u.* 
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ? AND s.expires_at > ?
        """, (token.strip(), now_iso))
        row = cursor.fetchone()
        if not row:
            return None
        user = _row_to_user(row)
        if user.is_blocked:
            return None
        return user


def logout_user(token: str) -> bool:
    if not token:
        return False
    user = get_user_from_token(token)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE token = ?", (token.strip(),))

    if user:
        record_audit(
            action="LOGOUT",
            details=f"Пользователь '{user.username}' вышел из системы",
            user_id=user.id,
            username=user.username,
            user_role=user.role
        )
    return True
