import datetime
from typing import Optional, List, Dict, Any
from backend.database import get_db
from backend.models import Task, User
from backend.services.audit_service import record_audit

STATUS_LABELS = {
    "new": "Новая",
    "in_progress": "В работе",
    "review": "На проверке",
    "completed": "Выполнена",
    "cancelled": "Отменена"
}

PRIORITY_LABELS = {
    "low": "Низкий",
    "medium": "Средний",
    "high": "Высокий",
    "critical": "Критический"
}


def _row_to_task(row: Any) -> Task:
    return Task(
        id=row["id"],
        number=row["number"],
        title=row["title"],
        description=row["description"],
        status=row["status"],
        priority=row["priority"],
        assignee_id=row["assignee_id"],
        assignee_name=row["assignee_name"] if "assignee_name" in row.keys() else None,
        created_by_id=row["created_by_id"],
        created_by_name=row["created_by_name"] if "created_by_name" in row.keys() else "admin",
        created_at=row["created_at"],
        updated_at=row["updated_at"]
    )


def generate_task_number(period: Optional[str] = None) -> str:
    if not period:
        dt_now = datetime.datetime.now(datetime.timezone.utc)
        period = dt_now.strftime("%m-%Y")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO task_counters (period, current_count)
            VALUES (?, 1)
            ON CONFLICT(period) DO UPDATE SET current_count = current_count + 1
        """, (period,))
        cursor.execute("SELECT current_count FROM task_counters WHERE period = ?", (period,))
        count = cursor.fetchone()["current_count"]
        return f"{count:03d}/{period}"


def create_task(
    title: str,
    description: str,
    priority: str,
    assignee_id: Optional[int],
    actor: User
) -> Task:
    if actor.role != "admin":
        raise PermissionError("Только администратор имеет право создавать новые заявки")

    title = title.strip()
    description = description.strip()
    if not title:
        raise ValueError("Название задачи обязательно для заполнения")
    if priority not in PRIORITY_LABELS:
        raise ValueError(f"Недопустимый приоритет: {priority}")

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    period = datetime.datetime.now(datetime.timezone.utc).strftime("%m-%Y")

    with get_db() as conn:
        cursor = conn.cursor()
        # Atomic counter increment
        cursor.execute("""
            INSERT INTO task_counters (period, current_count)
            VALUES (?, 1)
            ON CONFLICT(period) DO UPDATE SET current_count = current_count + 1
        """, (period,))
        cursor.execute("SELECT current_count FROM task_counters WHERE period = ?", (period,))
        count = cursor.fetchone()["current_count"]
        task_number = f"{count:03d}/{period}"

        # Verify assignee exists if given
        if assignee_id:
            cursor.execute("SELECT id, full_name FROM users WHERE id = ?", (assignee_id,))
            u = cursor.fetchone()
            if not u:
                raise ValueError("Указанный исполнитель не найден")

        cursor.execute("""
            INSERT INTO tasks (
                number, title, description, status, priority, assignee_id,
                created_by_id, created_at, updated_at
            ) VALUES (?, ?, ?, 'new', ?, ?, ?, ?, ?)
        """, (
            task_number,
            title,
            description,
            priority,
            assignee_id,
            actor.id,
            now,
            now
        ))
        task_id = cursor.lastrowid

    record_audit(
        action="TASK_CREATED",
        details=f"Создана заявка №{task_number} '{title}' (Приоритет: {PRIORITY_LABELS.get(priority, priority)})",
        user_id=actor.id,
        username=actor.username,
        user_role=actor.role,
        task_id=task_id,
        task_number=task_number
    )

    created_task = get_task_by_id(task_id)
    if not created_task:
        raise RuntimeError("Ошибка при создании задачи")
    return created_task


def get_task_by_id(task_id: int) -> Optional[Task]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                t.*,
                u_assignee.full_name AS assignee_name,
                u_creator.full_name AS created_by_name
            FROM tasks t
            LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
            LEFT JOIN users u_creator ON t.created_by_id = u_creator.id
            WHERE t.id = ?
        """, (task_id,))
        row = cursor.fetchone()
        return _row_to_task(row) if row else None


def list_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assignee_id: Optional[int] = None,
    search: Optional[str] = None
) -> List[Dict[str, Any]]:
    query = """
        SELECT 
            t.*,
            u_assignee.full_name AS assignee_name,
            u_creator.full_name AS created_by_name
        FROM tasks t
        LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
        LEFT JOIN users u_creator ON t.created_by_id = u_creator.id
        WHERE 1=1
    """
    params: List[Any] = []

    if status:
        query += " AND t.status = ?"
        params.append(status)

    if priority:
        query += " AND t.priority = ?"
        params.append(priority)

    if assignee_id is not None:
        query += " AND t.assignee_id = ?"
        params.append(assignee_id)

    if search:
        query += " AND (t.number LIKE ? OR t.title LIKE ? OR t.description LIKE ? OR u_assignee.full_name LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s, s])

    query += " ORDER BY t.id DESC"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]


def update_task(
    task_id: int,
    updates: Dict[str, Any],
    actor: User
) -> Task:
    task = get_task_by_id(task_id)
    if not task:
        raise ValueError(f"Задача #{task_id} не найдена")

    changes: List[str] = []
    sql_sets: List[str] = []
    sql_params: List[Any] = []

    # Status update: allowed for both user and admin
    if "status" in updates and updates["status"] != task.status:
        new_status = updates["status"]
        if new_status not in STATUS_LABELS:
            raise ValueError(f"Недопустимый статус: {new_status}")
        old_lbl = STATUS_LABELS.get(task.status, task.status)
        new_lbl = STATUS_LABELS.get(new_status, new_status)
        changes.append(f"Статус изменен: '{old_lbl}' -> '{new_lbl}'")
        sql_sets.append("status = ?")
        sql_params.append(new_status)

    # Title update: user can edit title and description, admin can edit all
    if "title" in updates and updates["title"].strip() != task.title:
        new_title = updates["title"].strip()
        if not new_title:
            raise ValueError("Название не может быть пустым")
        changes.append(f"Название изменено: '{task.title}' -> '{new_title}'")
        sql_sets.append("title = ?")
        sql_params.append(new_title)

    # Description update
    if "description" in updates and updates["description"].strip() != task.description:
        new_desc = updates["description"].strip()
        changes.append("Описание задачи обновлено")
        sql_sets.append("description = ?")
        sql_params.append(new_desc)

    # Admin-restricted fields: priority and assignee
    if "priority" in updates and updates["priority"] != task.priority:
        if actor.role != "admin":
            raise PermissionError("Изменять приоритетность задачи может только администратор")
        new_prio = updates["priority"]
        if new_prio not in PRIORITY_LABELS:
            raise ValueError(f"Недопустимый приоритет: {new_prio}")
        old_p = PRIORITY_LABELS.get(task.priority, task.priority)
        new_p = PRIORITY_LABELS.get(new_prio, new_prio)
        changes.append(f"Приоритет изменен: '{old_p}' -> '{new_p}'")
        sql_sets.append("priority = ?")
        sql_params.append(new_prio)

    if "assignee_id" in updates and updates["assignee_id"] != task.assignee_id:
        if actor.role != "admin":
            raise PermissionError("Назначать исполнителя может только администратор")
        new_assignee_id = updates["assignee_id"]
        assignee_name = "Не назначен"
        if new_assignee_id:
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT full_name FROM users WHERE id = ?", (new_assignee_id,))
                user_row = cursor.fetchone()
                if not user_row:
                    raise ValueError("Указанный исполнитель не найден")
                assignee_name = user_row["full_name"]
        old_assignee = task.assignee_name or "Не назначен"
        changes.append(f"Исполнитель изменен: '{old_assignee}' -> '{assignee_name}'")
        sql_sets.append("assignee_id = ?")
        sql_params.append(new_assignee_id)

    if not changes:
        return task

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    sql_sets.append("updated_at = ?")
    sql_params.append(now)
    sql_params.append(task_id)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(f"UPDATE tasks SET {', '.join(sql_sets)} WHERE id = ?", sql_params)

    audit_action = "STATUS_CHANGED" if len(changes) == 1 and "Статус" in changes[0] else "TASK_UPDATED"
    record_audit(
        action=audit_action,
        details="; ".join(changes),
        user_id=actor.id,
        username=actor.username,
        user_role=actor.role,
        task_id=task.id,
        task_number=task.number
    )

    updated = get_task_by_id(task_id)
    if not updated:
        raise RuntimeError("Ошибка при получении обновленной задачи")
    return updated
