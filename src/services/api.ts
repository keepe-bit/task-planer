import {
  User,
  Task,
  AuditLogItem,
  AuthResponse,
  CreateTaskPayload,
  UpdateTaskPayload,
} from '../types';

const TOKEN_KEY = 'task_planer_auth_token';

export const authStorage = {
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = authStorage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && path !== '/api/auth/login') {
      authStorage.clearToken();
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    const message = (data && data.error) || `HTTP Error ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  // Auth
  async login(credentials: { username: string; password: string }): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    authStorage.setToken(res.token);
    return res;
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      authStorage.clearToken();
    }
  },

  async getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/me');
  },

  // Tasks
  async getTasks(params?: {
    status?: string;
    priority?: string;
    assignee_id?: number;
    search?: string;
  }): Promise<{ tasks: Task[] }> {
    const q = new URLSearchParams();
    if (params?.status && params.status !== 'all') q.set('status', params.status);
    if (params?.priority && params.priority !== 'all') q.set('priority', params.priority);
    if (params?.assignee_id != null) q.set('assignee_id', String(params.assignee_id));
    if (params?.search) q.set('search', params.search);

    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<{ tasks: Task[] }>(`/api/tasks${qs}`);
  },

  async getTask(id: number): Promise<{ task: Task }> {
    return request<{ task: Task }>(`/api/tasks/${id}`);
  },

  async createTask(payload: CreateTaskPayload): Promise<{ task: Task }> {
    return request<{ task: Task }>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateTask(id: number, payload: UpdateTaskPayload): Promise<{ task: Task }> {
    return request<{ task: Task }>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async getTaskAudit(id: number): Promise<{ audit_logs: AuditLogItem[] }> {
    return request<{ audit_logs: AuditLogItem[] }>(`/api/tasks/${id}/audit`);
  },

  // Audit
  async getAuditLogs(params?: {
    limit?: number;
    search?: string;
    action?: string;
  }): Promise<{ audit_logs: AuditLogItem[] }> {
    const q = new URLSearchParams();
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.search) q.set('search', params.search);
    if (params?.action) q.set('action', params.action);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<{ audit_logs: AuditLogItem[] }>(`/api/audit${qs}`);
  },

  // Users (Admin only)
  async getUsers(): Promise<{ users: User[] }> {
    return request<{ users: User[] }>('/api/users');
  },

  async createUser(payload: {
    username: string;
    password: string;
    full_name: string;
    role: 'admin' | 'user';
  }): Promise<{ user: User }> {
    return request<{ user: User }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async blockUser(username: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/users/${encodeURIComponent(username)}/block`, {
      method: 'POST',
    });
  },

  async unblockUser(username: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/users/${encodeURIComponent(username)}/unblock`, {
      method: 'POST',
    });
  },

  async deleteUser(username: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/users/${encodeURIComponent(username)}`, {
      method: 'DELETE',
    });
  },

  async setUserRole(username: string, role: 'admin' | 'user'): Promise<{ success: boolean; message: string }> {
    return request(`/api/users/${encodeURIComponent(username)}/set-role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  },

  async resetPassword(username: string, password: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/users/${encodeURIComponent(username)}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  // CLI execution endpoint
  async executeCli(command: string): Promise<{ exit_code: number; output: string }> {
    return request<{ exit_code: number; output: string }>('/api/cli/execute', {
      method: 'POST',
      body: JSON.stringify({ command }),
    });
  },
};
