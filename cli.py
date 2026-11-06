#!/usr/bin/env python3
import sys
import argparse
from typing import List

from backend.database import init_database
from backend.services.user_service import (
    create_user, list_users, block_user, unblock_user,
    delete_user, set_user_role, reset_user_password, get_user_by_username
)
from backend.services.task_service import list_tasks, STATUS_LABELS, PRIORITY_LABELS
from backend.services.audit_service import list_audit_logs


def handle_user_add(args: argparse.Namespace) -> None:
    full_name = args.name or args.username
    user = create_user(
        username=args.username,
        password=args.password,
        full_name=full_name,
        role=args.role
    )
    print(f"Пользователь '{user.username}' успешно создан (ID: {user.id}, Роль: {user.role})")


def handle_user_list(_args: argparse.Namespace) -> None:
    users = list_users()
    if not users:
        print("Пользователи не найдены")
        return

    print(f"{'ID':<4} | {'Логин':<16} | {'Роль':<8} | {'Статус':<12} | {'ФИО':<28}")
    print("-" * 75)
    for u in users:
        status_str = "Заблокирован" if u["is_blocked"] else "Активен"
        print(f"{u['id']:<4} | {u['username']:<16} | {u['role']:<8} | {status_str:<12} | {u['full_name']:<28}")


def handle_user_block(args: argparse.Namespace) -> None:
    block_user(args.username)
    print(f"Пользователь '{args.username}' успешно заблокирован")


def handle_user_unblock(args: argparse.Namespace) -> None:
    unblock_user(args.username)
    print(f"Пользователь '{args.username}' успешно разблокирован")


def handle_user_delete(args: argparse.Namespace) -> None:
    delete_user(args.username)
    print(f"Пользователь '{args.username}' успешно удален")


def handle_user_set_role(args: argparse.Namespace) -> None:
    set_user_role(args.username, args.role)
    print(f"Роль пользователя '{args.username}' изменена на '{args.role}'")


def handle_user_reset_password(args: argparse.Namespace) -> None:
    reset_user_password(args.username, args.password)
    print(f"Пароль пользователя '{args.username}' успешно обновлен")


def handle_task_list(args: argparse.Namespace) -> None:
    tasks = list_tasks(status=args.status)
    if not tasks:
        print("Задачи не найдены")
        return

    print(f"{'Номер':<14} | {'Статус':<14} | {'Приоритет':<12} | {'Исполнитель':<22} | {'Название'}")
    print("-" * 85)
    for t in tasks:
        status = STATUS_LABELS.get(t["status"], t["status"])
        prio = PRIORITY_LABELS.get(t["priority"], t["priority"])
        assignee = t["assignee_name"] or "—"
        print(f"{t['number']:<14} | {status:<14} | {prio:<12} | {assignee:<22} | {t['title']}")


def handle_audit_list(args: argparse.Namespace) -> None:
    logs = list_audit_logs(limit=args.limit)
    if not logs:
        print("Записи аудита отсутствуют")
        return

    print(f"{'Дата/Время (UTC)':<24} | {'Оператор':<16} | {'Событие':<18} | {'Детали'}")
    print("-" * 90)
    for l in logs:
        ts = l["timestamp"][:19].replace("T", " ")
        actor = f"{l['username']} ({l['user_role']})"
        print(f"{ts:<24} | {actor:<16} | {l['action']:<18} | {l['details']}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="cli.py",
        description="Консольная утилита администрирования Task-Planer Enterprise"
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # init-db
    subparsers.add_parser("init-db", help="Инициализировать базу данных и создать таблицы")

    # user
    user_parser = subparsers.add_parser("user", help="Управление пользователями и правами")
    user_sub = user_parser.add_subparsers(dest="user_action", required=True)

    # user add
    p_add = user_sub.add_parser("add", help="Создать нового пользователя")
    p_add.add_argument("username", help="Логин пользователя")
    p_add.add_argument("password", help="Пароль пользователя (мин. 6 символов)")
    p_add.add_argument("--role", choices=["user", "admin"], default="user", help="Роль (по умолчанию: user)")
    p_add.add_argument("--name", help="Полное имя / ФИО")
    p_add.set_defaults(func=handle_user_add)

    # user list
    p_ulist = user_sub.add_parser("list", help="Список всех пользователей")
    p_ulist.set_defaults(func=handle_user_list)

    # user block
    p_block = user_sub.add_parser("block", help="Заблокировать пользователя")
    p_block.add_argument("username", help="Логин пользователя")
    p_block.set_defaults(func=handle_user_block)

    # user unblock
    p_unblock = user_sub.add_parser("unblock", help="Разблокировать пользователя")
    p_unblock.add_argument("username", help="Логин пользователя")
    p_unblock.set_defaults(func=handle_user_unblock)

    # user delete
    p_del = user_sub.add_parser("delete", help="Удалить пользователя")
    p_del.add_argument("username", help="Логин пользователя")
    p_del.set_defaults(func=handle_user_delete)

    # user set-role
    p_role = user_sub.add_parser("set-role", help="Изменить роль пользователя")
    p_role.add_argument("username", help="Логин пользователя")
    p_role.add_argument("role", choices=["user", "admin"], help="Новая роль")
    p_role.set_defaults(func=handle_user_set_role)

    # user reset-password
    p_pwd = user_sub.add_parser("reset-password", help="Сбросить пароль пользователя")
    p_pwd.add_argument("username", help="Логин пользователя")
    p_pwd.add_argument("password", help="Новый пароль")
    p_pwd.set_defaults(func=handle_user_reset_password)

    # task list
    task_parser = subparsers.add_parser("task", help="Просмотр задач")
    task_sub = task_parser.add_subparsers(dest="task_action", required=True)
    p_tlist = task_sub.add_parser("list", help="Список задач")
    p_tlist.add_argument("--status", choices=["new", "in_progress", "review", "completed", "cancelled"], help="Фильтр по статусу")
    p_tlist.set_defaults(func=handle_task_list)

    # audit list
    audit_parser = subparsers.add_parser("audit", help="Журнал аудита")
    audit_sub = audit_parser.add_subparsers(dest="audit_action", required=True)
    p_alist = audit_sub.add_parser("list", help="Просмотр записей журнала")
    p_alist.add_argument("--limit", type=int, default=30, help="Количество записей (по умолчанию 30)")
    p_alist.set_defaults(func=handle_audit_list)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "init-db":
        init_database()
        print("База данных успешно инициализирована")
        return

    init_database()
    try:
        args.func(args)
    except Exception as e:
        print(f"Ошибка: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
