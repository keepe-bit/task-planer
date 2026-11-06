from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any


@dataclass
class User:
    id: int
    username: str
    password_hash: str
    full_name: str
    role: str
    is_blocked: bool
    created_at: str

    def to_safe_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d.pop("password_hash", None)
        return d


@dataclass
class Task:
    id: int
    number: str
    title: str
    description: str
    status: str
    priority: str
    assignee_id: Optional[int]
    assignee_name: Optional[str]
    created_by_id: int
    created_by_name: str
    created_at: str
    updated_at: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class AuditLog:
    id: int
    task_id: Optional[int]
    task_number: Optional[str]
    user_id: Optional[int]
    username: str
    user_role: str
    action: str
    details: str
    timestamp: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
