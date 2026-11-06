import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Ban, 
  CheckCircle, 
  Trash2, 
  KeyRound, 
  AlertCircle,
  X,
  Check
} from 'lucide-react';
import { User } from '../types';
import { api } from '../services/api';
import { formatAuditTimestamp } from '../utils/plannerLogic';

interface AdminUsersViewProps {
  users: User[];
  currentUser: User;
  onRefreshUsers: () => void;
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({
  users,
  currentUser,
  onRefreshUsers,
}) => {
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [resetPwdUser, setResetPwdUser] = useState<User | null>(null);

  // Form states for Add User
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');

  // Form state for Reset Password
  const [newPasswordValue, setNewPasswordValue] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newUsername.trim() || !newPassword || !newFullName.trim()) {
      setError('Заполните все обязательные поля');
      return;
    }

    try {
      setLoading(true);
      await api.createUser({
        username: newUsername.trim(),
        password: newPassword,
        full_name: newFullName.trim(),
        role: newRole,
      });
      setSuccess(`Пользователь '${newUsername}' успешно создан`);
      setShowAddModal(false);
      setNewUsername('');
      setNewPassword('');
      setNewFullName('');
      setNewRole('user');
      onRefreshUsers();
    } catch (err: any) {
      setError(err.message || 'Ошибка создания пользователя');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async (u: User) => {
    setError(null);
    setSuccess(null);
    try {
      setLoading(true);
      if (u.is_blocked) {
        await api.unblockUser(u.username);
        setSuccess(`Пользователь '${u.username}' разблокирован`);
      } else {
        await api.blockUser(u.username);
        setSuccess(`Пользователь '${u.username}' заблокирован`);
      }
      onRefreshUsers();
    } catch (err: any) {
      setError(err.message || 'Ошибка изменения статуса блокировки');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (!window.confirm(`Вы действительно хотите удалить учетную запись '${u.username}'?`)) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      setLoading(true);
      await api.deleteUser(u.username);
      setSuccess(`Пользователь '${u.username}' удален`);
      onRefreshUsers();
    } catch (err: any) {
      setError(err.message || 'Ошибка удаления пользователя');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRole = async (u: User) => {
    const nextRole = u.role === 'admin' ? 'user' : 'admin';
    setError(null);
    setSuccess(null);
    try {
      setLoading(true);
      await api.setUserRole(u.username, nextRole);
      setSuccess(`Роль пользователя '${u.username}' изменена на '${nextRole}'`);
      onRefreshUsers();
    } catch (err: any) {
      setError(err.message || 'Ошибка изменения роли');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPwdUser) return;
    setError(null);
    setSuccess(null);

    if (!newPasswordValue || newPasswordValue.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    try {
      setLoading(true);
      await api.resetPassword(resetPwdUser.username, newPasswordValue);
      setSuccess(`Пароль пользователя '${resetPwdUser.username}' успешно обновлен`);
      setResetPwdUser(null);
      setNewPasswordValue('');
    } catch (err: any) {
      setError(err.message || 'Ошибка сброса пароля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Notifications */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2">
          <Check className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Управление учетными записями пользователей
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Контроль доступа, блокировка, роли и безопасное хранение хэшей паролей
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Добавить пользователя</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Логин</th>
                <th className="py-3 px-4">ФИО / Имя</th>
                <th className="py-3 px-4">Роль</th>
                <th className="py-3 px-4">Статус доступа</th>
                <th className="py-3 px-4">Дата регистрации</th>
                <th className="py-3 px-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {users.map((u) => {
                const isSelf = u.id === currentUser.id;

                return (
                  <tr key={u.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition">
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {u.username}
                      {isSelf && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded">
                          Вы
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-zinc-800 dark:text-zinc-200">
                      {u.full_name}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        onClick={() => !isSelf && handleToggleRole(u)}
                        disabled={isSelf}
                        title={isSelf ? 'Нельзя изменить собственную роль' : 'Нажмите, чтобы переключить роль'}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300'
                            : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                        } ${!isSelf ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
                      >
                        {u.role === 'admin' ? (
                          <>
                            <Shield className="w-3 h-3" />
                            <span>Администратор</span>
                          </>
                        ) : (
                          <span>Пользователь</span>
                        )}
                      </button>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {u.is_blocked ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                          <Ban className="w-3.5 h-3.5" />
                          <span>Заблокирован</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Активен</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                      {formatAuditTimestamp(u.created_at)}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                      {/* Password reset button */}
                      <button
                        onClick={() => setResetPwdUser(u)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                        title="Сбросить пароль"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>

                      {/* Block / Unblock button */}
                      {!isSelf && (
                        <button
                          onClick={() => handleToggleBlock(u)}
                          className={`p-1.5 rounded transition ${
                            u.is_blocked
                              ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                          }`}
                          title={u.is_blocked ? 'Разблокировать' : 'Заблокировать'}
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete button */}
                      {!isSelf && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                          title="Удалить пользователя"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add User */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-md overflow-hidden my-6">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <span>Создание пользователя</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Логин пользователя (англ. буквы, мин. 3 символа)
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  placeholder="ivanov"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  ФИО / Полное имя
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  required
                  placeholder="Иван Иванов (Старший инженер)"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Первоначальный пароль (мин. 6 символов)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Роль в системе
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="user">Пользователь (просмотр и редактирование задач)</option>
                  <option value="admin">Администратор (создание, полный аудит, управление)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {resetPwdUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-sm overflow-hidden my-6">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-600" />
                <span>Сброс пароля для '{resetPwdUser.username}'</span>
              </h3>
              <button
                onClick={() => setResetPwdUser(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Новый пароль
                </label>
                <input
                  type="password"
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  required
                  placeholder="Минимум 6 символов"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <p className="text-[11px] text-zinc-500">
                После сброса пароля все активные сеансы данного пользователя будут автоматически завершены.
              </p>

              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetPwdUser(null)}
                  className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Сохранение...' : 'Обновить пароль'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
