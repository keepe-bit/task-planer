import React, { useState, useEffect } from 'react';
import { X, Check, Clock, User as UserIcon, AlertCircle, ShieldAlert, History } from 'lucide-react';
import { Task, User, AuditLogItem } from '../types';
import { api } from '../services/api';
import { 
  STATUS_MAP, 
  PRIORITY_MAP, 
  canUserEditField, 
  formatAuditTimestamp, 
  TaskStatus, 
  TaskPriority 
} from '../utils/plannerLogic';

interface TaskDetailModalProps {
  task: Task;
  currentUser: User;
  usersList: User[];
  onClose: () => void;
  onTaskUpdated: (updatedTask: Task) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  currentUser,
  usersList,
  onClose,
  onTaskUpdated,
}) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [assigneeId, setAssigneeId] = useState<number | null>(task.assignee_id);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    loadAudit();
  }, [task.id]);

  const loadAudit = async () => {
    try {
      setLoadingAudit(true);
      const res = await api.getTaskAudit(task.id);
      setAuditLogs(res.audit_logs || []);
    } catch (e: any) {
      console.error('Failed to load task audit:', e);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const payload: any = {};
    if (title.trim() !== task.title) payload.title = title.trim();
    if (description.trim() !== task.description) payload.description = description.trim();
    if (status !== task.status) payload.status = status;

    if (currentUser.role === 'admin') {
      if (priority !== task.priority) payload.priority = priority;
      if (assigneeId !== task.assignee_id) payload.assignee_id = assigneeId;
    }

    if (Object.keys(payload).length === 0) {
      setError('Изменения не обнаружены');
      return;
    }

    try {
      setSaving(true);
      const res = await api.updateTask(task.id, payload);
      setSuccessMsg('Изменения успешно сохранены в БД и зафиксированы в аудите');
      onTaskUpdated(res.task);
      await loadAudit();
    } catch (err: any) {
      setError(err.message || 'Ошибка при сохранении задачи');
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-3xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-900 dark:text-zinc-100">
              № {task.number}
            </span>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Создана: {formatAuditTimestamp(task.created_at)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form id="task-edit-form" onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Название задачи
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Описание
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Статус выполнения
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                >
                  <option value="new">Новая</option>
                  <option value="in_progress">В работе</option>
                  <option value="review">На проверке</option>
                  <option value="completed">Выполнена</option>
                  <option value="cancelled">Отменена</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
                  <span>Приоритет</span>
                  {!isAdmin && <span className="text-[10px] text-zinc-400 font-normal">Только админ</span>}
                </label>
                <select
                  value={priority}
                  disabled={!isAdmin}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                  <option value="critical">Критический</option>
                </select>
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
                  <span>Исполнитель</span>
                  {!isAdmin && <span className="text-[10px] text-zinc-400 font-normal">Только админ</span>}
                </label>
                <select
                  value={assigneeId || ''}
                  disabled={!isAdmin}
                  onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">Не назначен</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.username} {u.is_blocked ? '(Заблокирован)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </form>

          {/* Audit Log / Change History for this task */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Журнал изменений задачи (Аудит)
              </h3>
            </div>

            {loadingAudit ? (
              <div className="text-xs text-zinc-400 py-3">Загрузка истории изменений...</div>
            ) : auditLogs.length === 0 ? (
              <div className="text-xs text-zinc-400 py-3">Записей аудита пока нет</div>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 text-xs"
                  >
                    <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
                      <div className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
                        <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{log.username}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-zinc-200 dark:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-300">
                          {log.user_role}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <Clock className="w-3 h-3" />
                        <span>{formatAuditTimestamp(log.timestamp)}</span>
                      </div>
                    </div>
                    <div className="text-zinc-900 dark:text-zinc-200 mt-1">
                      {log.details}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 flex items-center justify-between">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {isAdmin ? 'Администратор: полный доступ к редактированию' : 'Пользователь: редактирование названия, описания и статуса'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition"
            >
              Закрыть
            </button>
            <button
              type="submit"
              form="task-edit-form"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? <span>Сохранение...</span> : <span>Сохранить изменения</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
