export type TaskStatus = 'new' | 'in_progress' | 'review' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type UserRole = 'admin' | 'user';

export interface TaskItem {
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

export const STATUS_MAP: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  new: { label: 'Новая', color: 'text-sky-700 dark:text-sky-300', bg: 'bg-sky-50 dark:bg-sky-950/60' },
  in_progress: { label: 'В работе', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/60' },
  review: { label: 'На проверке', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-950/60' },
  completed: { label: 'Выполнена', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/60' },
  cancelled: { label: 'Отменена', color: 'text-zinc-600 dark:text-zinc-400', bg: 'bg-zinc-100 dark:bg-zinc-800/60' },
};

export const PRIORITY_MAP: Record<TaskPriority, { label: string; color: string; border: string }> = {
  low: { label: 'Низкий', color: 'text-zinc-600 dark:text-zinc-400', border: 'border-zinc-300 dark:border-zinc-700' },
  medium: { label: 'Средний', color: 'text-blue-600 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-700' },
  high: { label: 'Высокий', color: 'text-amber-600 dark:text-amber-400', border: 'border-amber-400 dark:border-amber-600' },
  critical: { label: 'Критический', color: 'text-rose-600 dark:text-rose-400', border: 'border-rose-400 dark:border-rose-600' },
};

/**
 * Formats a task auto-counter into the required format: number/month-year (e.g. 001/11-2026)
 */
export function formatTaskNumber(counter: number, dateInput: Date | string = new Date()): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  const numStr = String(counter).padStart(3, '0');
  return `${numStr}/${month}-${year}`;
}

/**
 * Parses a task number like "042/11-2026"
 */
export function parseTaskNumber(taskNumber: string): { counter: number; month: number; year: number } | null {
  const match = taskNumber.trim().match(/^(\d{1,6})\/(\d{2})-(\d{4})$/);
  if (!match) return null;
  return {
    counter: parseInt(match[1], 10),
    month: parseInt(match[2], 10),
    year: parseInt(match[3], 10),
  };
}

/**
 * Validates permission to edit specific task fields based on user role
 */
export function canUserEditField(role: UserRole, fieldName: 'title' | 'description' | 'status' | 'priority' | 'assignee_id'): boolean {
  if (role === 'admin') return true;
  // Standard user can only edit status, title and description
  return fieldName === 'status' || fieldName === 'title' || fieldName === 'description';
}

/**
 * Pure filter function for task collections
 */
export function filterTasks(
  tasks: TaskItem[],
  filters: {
    status?: string | null;
    priority?: string | null;
    assigneeId?: number | null;
    search?: string | null;
  }
): TaskItem[] {
  return tasks.filter((t) => {
    if (filters.status && filters.status !== 'all' && t.status !== filters.status) {
      return false;
    }
    if (filters.priority && filters.priority !== 'all' && t.priority !== filters.priority) {
      return false;
    }
    if (filters.assigneeId != null && t.assignee_id !== filters.assigneeId) {
      return false;
    }
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      const numMatch = t.number.toLowerCase().includes(q);
      const titleMatch = t.title.toLowerCase().includes(q);
      const descMatch = t.description.toLowerCase().includes(q);
      const assigneeMatch = (t.assignee_name || '').toLowerCase().includes(q);
      if (!numMatch && !titleMatch && !descMatch && !assigneeMatch) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Formats ISO timestamp to human-friendly European date/time: DD.MM.YYYY, HH:mm:ss
 */
export function formatAuditTimestamp(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const secs = String(d.getSeconds()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${mins}:${secs}`;
  } catch {
    return isoDate;
  }
}
