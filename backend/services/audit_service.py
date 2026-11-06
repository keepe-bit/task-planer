import datetime
from typing import Optional, List, Dict, Any
from backend.database import get_db
from backend.models import AuditLog


def record_audit(
    action: str,
    details: str,
    user_id: Optional[int] = None,
    username: str = "system",
    user_role: str = "system",
    task_id: Optional[int] = None,
    task_number: Optional[str] = None
) -> AuditLog:
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO audit_logs (task_id, task_number, user_id, username, user_role, action, details, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (task_id, task_number, user_id, username, user_role, action, details, now))
        log_id = cursor.lastrowid
        return AuditLog(
            id=log_id,
            task_id=task_id,
            task_number=task_number,
            user_id=user_id,
            username=username,
            user_role=user_role,
            action=action,
            details=details,
            timestamp=now
        )


def list_audit_logs(
    task_id: Optional[int] = None,
    limit: int = 100,
    offset: int = 0,
    action: Optional[str] = None,
    search: Optional[str] = None
) -> List[Dict[str, Any]]:
    query = "SELECT * FROM audit_logs WHERE 1=1"
    params: List[Any] = []

    if task_id is not None:
        query += " AND task_id = ?"
        params.append(task_id)

    if action:
        query += " AND action = ?"
        params.append(action)

    if search:
        query += " AND (details LIKE ? OR username LIKE ? OR task_number LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s])

    query += " ORDER BY id DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
