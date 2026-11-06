import React, { useState, useEffect } from 'react';
import { History, Search, RefreshCw, Filter, Shield, Clock, FileText, UserCheck } from 'lucide-react';
import { AuditLogItem } from '../types';
import { api } from '../services/api';
import { formatAuditTimestamp } from '../utils/plannerLogic';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAuditLogs({
        search: search.trim() || undefined,
        action: actionFilter || undefined,
        limit: 100,
      });
      setLogs(res.audit_logs || []);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки журнала аудита');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs();
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'TASK_CREATED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">Создание задачи</span>;
      case 'STATUS_CHANGED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">Смена статуса</span>;
      case 'TASK_UPDATED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300">Изменение задачи</span>;
      case 'USER_CREATED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300">Новый пользователь</span>;
      case 'USER_BLOCKED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">Блокировка</span>;
      case 'USER_UNBLOCKED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300">Разблокировка</span>;
      case 'USER_DELETED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">Удаление</span>;
      case 'LOGIN_SUCCESS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300">Вход</span>;
      case 'LOGIN_FAILED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">Ошибка входа</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{action}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Журнал аудита операций
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Неизменяемый журнал всех событий системы с точными временными метками UTC
          </p>
        </div>

        <button
          onClick={loadLogs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Обновить</span>
        </button>
      </div>

      {/* Filter bar */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по описанию события, пользователю, номеру заявки..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shrink-0"
        >
          <option value="">Все типы событий</option>
          <option value="TASK_CREATED">Создание заявки</option>
          <option value="STATUS_CHANGED">Смена статуса</option>
          <option value="TASK_UPDATED">Обновление задачи</option>
          <option value="USER_CREATED">Создание пользователя</option>
          <option value="USER_BLOCKED">Блокировка пользователя</option>
          <option value="USER_UNBLOCKED">Разблокировка пользователя</option>
          <option value="USER_DELETED">Удаление пользователя</option>
          <option value="LOGIN_SUCCESS">Успешный вход</option>
          <option value="LOGIN_FAILED">Неудачный вход</option>
        </select>

        <button
          type="submit"
          className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg transition"
        >
          Найти
        </button>
      </form>

      {/* Logs Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Время (UTC)</th>
                <th className="py-3 px-4">Оператор</th>
                <th className="py-3 px-4">Событие</th>
                <th className="py-3 px-4">Заявка</th>
                <th className="py-3 px-4">Подробности изменения</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    Загрузка журнала аудита...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    Записи аудита по заданным критериям не найдены
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition">
                    {/* Timestamp */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-zinc-600 dark:text-zinc-400 text-[11px]">
                      {formatAuditTimestamp(log.timestamp)}
                    </td>

                    {/* Actor */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{log.username}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-mono">
                          {log.user_role}
                        </span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>

                    {/* Target Task Number */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.task_number ? (
                        <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                          № {log.task_number}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>

                    {/* Details */}
                    <td className="py-3 px-4 text-zinc-800 dark:text-zinc-200 max-w-md sm:max-w-xl">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
