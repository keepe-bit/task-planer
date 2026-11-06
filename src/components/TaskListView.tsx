import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  User as UserIcon, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Task, User, TaskStatus, TaskPriority } from '../types';
import { STATUS_MAP, PRIORITY_MAP, formatAuditTimestamp, filterTasks } from '../utils/plannerLogic';

interface TaskListViewProps {
  tasks: Task[];
  currentUser: User;
  onSelectTask: (task: Task) => void;
  onCreateTaskClick: () => void;
  onQuickStatusChange: (task: Task, newStatus: TaskStatus) => void;
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  tasks,
  currentUser,
  onSelectTask,
  onCreateTaskClick,
  onQuickStatusChange,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Calculate metrics
  const totalCount = tasks.length;
  const newCount = tasks.filter((t) => t.status === 'new').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const reviewCount = tasks.filter((t) => t.status === 'review').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  const filtered = filterTasks(tasks, {
    status: statusFilter,
    priority: priorityFilter,
    search: search,
  });

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="space-y-6">
      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 rounded-xl border text-left transition ${
            statusFilter === 'all'
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Всего заявок</div>
          <div className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
            {totalCount}
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('new')}
          className={`p-3.5 rounded-xl border text-left transition ${
            statusFilter === 'new'
              ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/40'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="text-xs text-sky-600 dark:text-sky-400 font-medium">Новые</div>
          <div className="text-2xl font-bold font-mono tracking-tight text-sky-700 dark:text-sky-300 mt-1">
            {newCount}
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('in_progress')}
          className={`p-3.5 rounded-xl border text-left transition ${
            statusFilter === 'in_progress'
              ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/40'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">В работе</div>
          <div className="text-2xl font-bold font-mono tracking-tight text-amber-700 dark:text-amber-300 mt-1">
            {inProgressCount}
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('review')}
          className={`p-3.5 rounded-xl border text-left transition ${
            statusFilter === 'review'
              ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/40'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">На проверке</div>
          <div className="text-2xl font-bold font-mono tracking-tight text-purple-700 dark:text-purple-300 mt-1">
            {reviewCount}
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('completed')}
          className={`p-3.5 rounded-xl border text-left transition ${
            statusFilter === 'completed'
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Выполнены</div>
          <div className="text-2xl font-bold font-mono tracking-tight text-emerald-700 dark:text-emerald-300 mt-1">
            {completedCount}
          </div>
        </button>
      </div>

      {/* Action Bar & Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по номеру, названию, исполнителю..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shrink-0"
          >
            <option value="all">Все приоритеты</option>
            <option value="low">Низкий</option>
            <option value="medium">Средний</option>
            <option value="high">Высокий</option>
            <option value="critical">Критический</option>
          </select>
        </div>

        {isAdmin && (
          <button
            onClick={onCreateTaskClick}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Новая заявка</span>
          </button>
        )}
      </div>

      {/* Tasks Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Номер заявки</th>
                <th className="py-3 px-4">Название и описание</th>
                <th className="py-3 px-4">Статус</th>
                <th className="py-3 px-4">Приоритет</th>
                <th className="py-3 px-4">Исполнитель</th>
                <th className="py-3 px-4">Обновлено</th>
                <th className="py-3 px-4 text-right">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 dark:text-zinc-400">
                    <div className="max-w-xs mx-auto">
                      <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">Заявки не найдены</div>
                      <div className="text-xs text-zinc-500 mt-1">
                        Попробуйте сбросить фильтры поиска или создать новую заявку.
                      </div>
                      {isAdmin && (
                        <button
                          onClick={onCreateTaskClick}
                          className="mt-3 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition"
                        >
                          Создать заявку
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((task) => {
                  const statusInfo = STATUS_MAP[task.status] || STATUS_MAP.new;
                  const priorityInfo = PRIORITY_MAP[task.priority] || PRIORITY_MAP.medium;

                  return (
                    <tr
                      key={task.id}
                      onClick={() => onSelectTask(task)}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition group"
                    >
                      {/* Number with auto-counter format */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100 text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                          № {task.number}
                        </span>
                      </td>

                      {/* Title & snippet */}
                      <td className="py-3 px-4 max-w-xs sm:max-w-md">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                          {task.title}
                        </div>
                        <div className="text-zinc-500 dark:text-zinc-400 text-[11px] line-clamp-1 mt-0.5">
                          {task.description || 'Описание отсутствует'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={task.status}
                          onChange={(e) => onQuickStatusChange(task, e.target.value as TaskStatus)}
                          className={`text-[11px] font-semibold py-1 px-2 rounded-lg border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer ${statusInfo.bg} ${statusInfo.color}`}
                        >
                          <option value="new">Новая</option>
                          <option value="in_progress">В работе</option>
                          <option value="review">На проверке</option>
                          <option value="completed">Выполнена</option>
                          <option value="cancelled">Отменена</option>
                        </select>
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`text-[11px] font-medium ${priorityInfo.color}`}>
                          {priorityInfo.label}
                        </span>
                      </td>

                      {/* Assignee */}
                      <td className="py-3 px-4 whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                        {task.assignee_name ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-700 dark:text-zinc-200">
                              {task.assignee_name.charAt(0)}
                            </div>
                            <span className="truncate max-w-[140px]">{task.assignee_name}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic">Не назначен</span>
                        )}
                      </td>

                      {/* Updated At */}
                      <td className="py-3 px-4 whitespace-nowrap text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
                        {formatAuditTimestamp(task.updated_at)}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTask(task);
                          }}
                          className="p-1 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition"
                          title="Открыть карточку"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
