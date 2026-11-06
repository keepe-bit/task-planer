import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import json
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
import subprocess
from typing import Optional, Dict, Any

from backend.config import SERVER_HOST, SERVER_PORT
from backend.database import init_database
from backend.services.auth_service import authenticate_user, get_user_from_token, logout_user
from backend.services.user_service import (
    create_user, list_users, block_user, unblock_user,
    delete_user, set_user_role, reset_user_password, get_user_by_username
)
from backend.services.task_service import (
    create_task, list_tasks, get_task_by_id, update_task
)
from backend.services.audit_service import list_audit_logs
from backend.models import User


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


class ApiRequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:
        # Suppress noisy standard request logs unless needed
        pass

    def send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def send_json(self, status_code: int, data: Any) -> None:
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def send_error_json(self, status_code: int, message: str) -> None:
        self.send_json(status_code, {"error": message})

    def get_token(self) -> Optional[str]:
        auth_header = self.headers.get("Authorization")
        if not auth_header:
            return None
        parts = auth_header.split(" ")
        if len(parts) == 2 and parts[0].lower() == "bearer":
            return parts[1]
        return None

    def get_current_user(self) -> Optional[User]:
        token = self.get_token()
        if not token:
            return None
        return get_user_from_token(token)

    def parse_body(self) -> Dict[str, Any]:
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return {}
        body = self.rfile.read(content_length).decode("utf-8")
        try:
            return json.loads(body)
        except json.JSONDecodeError:
            raise ValueError("Некорректный JSON запрос")

    # Routing
    def do_GET(self) -> None:
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)

        # /api/health
        if path == "/api/health":
            self.send_json(200, {"status": "ok", "service": "task-planer-python"})
            return

        # /api/auth/me
        if path == "/api/auth/me":
            user = self.get_current_user()
            if not user:
                self.send_error_json(401, "Необходима авторизация")
                return
            self.send_json(200, {"user": user.to_safe_dict()})
            return

        # /api/users
        if path == "/api/users":
            user = self.get_current_user()
            if not user:
                self.send_error_json(401, "Необходима авторизация")
                return
            users = list_users()
            self.send_json(200, {"users": users})
            return

        # /api/tasks
        if path == "/api/tasks":
            user = self.get_current_user()
            if not user:
                self.send_error_json(401, "Необходима авторизация")
                return
            status = query.get("status", [None])[0]
            priority = query.get("priority", [None])[0]
            search = query.get("search", [None])[0]
            assignee_str = query.get("assignee_id", [None])[0]
            assignee_id = int(assignee_str) if assignee_str and assignee_str.isdigit() else None

            tasks = list_tasks(status=status, priority=priority, assignee_id=assignee_id, search=search)
            self.send_json(200, {"tasks": tasks})
            return

        # /api/tasks/<id>
        if path.startswith("/api/tasks/") and not path.endswith("/audit"):
            parts = path.strip("/").split("/")
            if len(parts) == 3 and parts[2].isdigit():
                user = self.get_current_user()
                if not user:
                    self.send_error_json(401, "Необходима авторизация")
                    return
                task_id = int(parts[2])
                task = get_task_by_id(task_id)
                if not task:
                    self.send_error_json(404, "Задача не найдена")
                    return
                self.send_json(200, {"task": task.to_dict()})
                return

        # /api/tasks/<id>/audit
        if path.startswith("/api/tasks/") and path.endswith("/audit"):
            parts = path.strip("/").split("/")
            if len(parts) == 4 and parts[2].isdigit():
                user = self.get_current_user()
                if not user:
                    self.send_error_json(401, "Необходима авторизация")
                    return
                task_id = int(parts[2])
                logs = list_audit_logs(task_id=task_id, limit=100)
                self.send_json(200, {"audit_logs": logs})
                return

        # /api/audit
        if path == "/api/audit":
            user = self.get_current_user()
            if not user:
                self.send_error_json(401, "Необходима авторизация")
                return
            limit_str = query.get("limit", ["100"])[0]
            limit = int(limit_str) if limit_str.isdigit() else 100
            search = query.get("search", [None])[0]
            action = query.get("action", [None])[0]
            logs = list_audit_logs(limit=limit, action=action, search=search)
            self.send_json(200, {"audit_logs": logs})
            return

        self.send_error_json(404, "Маршрут не найден")

    def do_POST(self) -> None:
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        try:
            body = self.parse_body()
        except ValueError as e:
            self.send_error_json(400, str(e))
            return

        # /api/auth/login
        if path == "/api/auth/login":
            username = body.get("username", "")
            password = body.get("password", "")
            try:
                res = authenticate_user(username, password)
                self.send_json(200, res)
            except PermissionError as e:
                self.send_error_json(403, str(e))
            except ValueError as e:
                self.send_error_json(401, str(e))
            except Exception as e:
                self.send_error_json(500, f"Внутренняя ошибка сервера: {e}")
            return

        # /api/auth/logout
        if path == "/api/auth/logout":
            token = self.get_token()
            if token:
                logout_user(token)
            self.send_json(200, {"success": True})
            return

        # Protected routes below: require authenticated user
        user = self.get_current_user()
        if not user:
            self.send_error_json(401, "Необходима авторизация")
            return

        # /api/tasks (Create task - Admin only)
        if path == "/api/tasks":
            if user.role != "admin":
                self.send_error_json(403, "Создавать заявки может только администратор")
                return
            try:
                task = create_task(
                    title=body.get("title", ""),
                    description=body.get("description", ""),
                    priority=body.get("priority", "medium"),
                    assignee_id=body.get("assignee_id"),
                    actor=user
                )
                self.send_json(201, {"task": task.to_dict()})
            except Exception as e:
                self.send_error_json(400, str(e))
            return

        # /api/users (Create user - Admin only)
        if path == "/api/users":
            if user.role != "admin":
                self.send_error_json(403, "Управлять пользователями может только администратор")
                return
            try:
                new_user = create_user(
                    username=body.get("username", ""),
                    password=body.get("password", ""),
                    full_name=body.get("full_name", ""),
                    role=body.get("role", "user"),
                    actor=user
                )
                self.send_json(201, {"user": new_user.to_safe_dict()})
            except Exception as e:
                self.send_error_json(400, str(e))
            return

        # /api/users/<username>/block
        if path.startswith("/api/users/") and path.endswith("/block"):
            if user.role != "admin":
                self.send_error_json(403, "Действие доступно только администратору")
                return
            username = path.split("/")[3]
            try:
                block_user(username, actor=user)
                self.send_json(200, {"success": True, "message": f"Пользователь '{username}' заблокирован"})
            except Exception as e:
                self.send_error_json(400, str(e))
            return

        # /api/users/<username>/unblock
        if path.startswith("/api/users/") and path.endswith("/unblock"):
            if user.role != "admin":
                self.send_error_json(403, "Действие доступно только администратору")
                return
            username = path.split("/")[3]
            try:
                unblock_user(username, actor=user)
                self.send_json(200, {"success": True, "message": f"Пользователь '{username}' разблокирован"})
            except Exception as e:
                self.send_error_json(400, str(e))
            return

        # /api/users/<username>/set-role
        if path.startswith("/api/users/") and path.endswith("/set-role"):
            if user.role != "admin":
                self.send_error_json(403, "Действие доступно только администратору")
                return
            username = path.split("/")[3]
            new_role = body.get("role", "")
            try:
                set_user_role(username, new_role, actor=user)
                self.send_json(200, {"success": True, "message": f"Роль обновлена на '{new_role}'"})
            except Exception as e:
                self.send_error_json(400, str(e))
            return

        # /api/users/<username>/reset-password
        if path.startswith("/api/users/") and path.endswith("/reset-password"):
            if user.role != "admin":
                self.send_error_json(403, "Действие доступно только администратору")
                return
            username = path.split("/")[3]
            new_password = body.get("password", "")
            try:
                reset_user_password(username, new_password, actor=user)
                self.send_json(200, {"success": True, "message": f"Пароль пользователя '{username}' обновлен"})
            except Exception as e:
                self.send_error_json(400, str(e))
            return

        # /api/cli/execute (Admin only CLI executor)
        if path == "/api/cli/execute":
            if user.role != "admin":
                self.send_error_json(403, "Консоль доступна только администратору")
                return
            command_line = body.get("command", "").strip()
            if not command_line:
                self.send_error_json(400, "Команда не указана")
                return

            # Sanitize to ensure only cli.py is executed
            import shlex
            tokens = shlex.split(command_line)
            if tokens and tokens[0] in ("python3", "python"):
                tokens = tokens[1:]
            if tokens and tokens[0] == "cli.py":
                tokens = tokens[1:]

            allowed_root_commands = ["user", "task", "audit", "init-db", "--help", "-h"]
            if not tokens or tokens[0] not in allowed_root_commands:
                self.send_error_json(400, "Разрешены только команды утилиты cli.py (user, task, audit, init-db, --help)")
                return

            full_cmd = [sys.executable, "cli.py"] + tokens
            try:
                proc = subprocess.run(
                    full_cmd,
                    capture_output=True,
                    text=True,
                    timeout=10,
                    cwd=str(backend_dir_root())
                )
                output = proc.stdout if proc.returncode == 0 else (proc.stdout + "\n" + proc.stderr)
                self.send_json(200, {
                    "exit_code": proc.returncode,
                    "output": output.strip() or "Команда выполнена без вывода"
                })
            except Exception as e:
                self.send_error_json(500, f"Ошибка выполнения команды: {e}")
            return

        self.send_error_json(404, "Маршрут не найден")

    def do_PATCH(self) -> None:
        user = self.get_current_user()
        if not user:
            self.send_error_json(401, "Необходима авторизация")
            return

        parts = self.path.strip("/").split("/")
        if len(parts) == 3 and parts[0] == "api" and parts[1] == "tasks" and parts[2].isdigit():
            task_id = int(parts[2])
            try:
                body = self.parse_body()
                updated_task = update_task(task_id, body, actor=user)
                self.send_json(200, {"task": updated_task.to_dict()})
            except PermissionError as e:
                self.send_error_json(403, str(e))
            except Exception as e:
                self.send_error_json(400, str(e))
            return

        self.send_error_json(404, "Маршрут не найден")

    def do_DELETE(self) -> None:
        user = self.get_current_user()
        if not user:
            self.send_error_json(401, "Необходима авторизация")
            return

        parts = self.path.strip("/").split("/")
        # /api/users/<username>
        if len(parts) == 3 and parts[0] == "api" and parts[1] == "users":
            if user.role != "admin":
                self.send_error_json(403, "Удалять пользователей может только администратор")
                return
            username = parts[2]
            try:
                delete_user(username, actor=user)
                self.send_json(200, {"success": True, "message": f"Пользователь '{username}' успешно удален"})
            except Exception as e:
                self.send_error_json(400, str(e))
            return

        self.send_error_json(404, "Маршрут не найден")


def backend_dir_root():
    from pathlib import Path
    return Path(__file__).resolve().parent.parent


def run_server(port: int = SERVER_PORT) -> None:
    init_database()
    server_address = (SERVER_HOST, port)
    httpd = ThreadedHTTPServer(server_address, ApiRequestHandler)
    print(f"Task-Planer Python REST Server running on http://{SERVER_HOST}:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == "__main__":
    port = SERVER_PORT
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        port = int(sys.argv[1])
    run_server(port)
