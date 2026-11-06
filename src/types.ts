export type TaskStatus = 'new' | 'in_progress' | 'review' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type UserRole = 'admin' | 'user';

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  is_blocked: boolean;
  created_at: string;
}

export interface Task {
  id: number;
  number: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: number | null;
  assignee_name?: string | null;
  created_by_id: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLogItem {
  id: number;
  task_id: number | null;
  task_number: string | null;
  user_id: number | null;
  username: string;
  user_role: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  expires_at: string;
}

export interface CreateTaskPayload {
  title: string;
  description: string;
  priority: TaskPriority;
  assignee_id?: number | null;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: number | null;
}
