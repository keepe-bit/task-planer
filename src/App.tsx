import React, { useState, useEffect, useCallback } from 'react';
import { User, Task, TaskStatus } from './types';
import { api, authStorage } from './services/api';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { TaskListView } from './components/TaskListView';
import { TaskDetailModal } from './components/TaskDetailModal';
import { CreateTaskModal } from './components/CreateTaskModal';
import { AuditLogView } from './components/AuditLogView';
import { AdminUsersView } from './components/AdminUsersView';
import { AdminCliTerminal } from './components/AdminCliTerminal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<'tasks' | 'audit' | 'users' | 'cli'>('tasks');

  // Application Data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Modals
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Theme
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // Check existing session
  const verifySession = useCallback(async () => {
    const token = authStorage.getToken();
    if (!token) {
      setCurrentUser(null);
      setCheckingAuth(false);
      return;
    }

    try {
      const res = await api.getMe();
      setCurrentUser(res.user);
    } catch {
      setCurrentUser(null);
      authStorage.clearToken();
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    verifySession();

    const handleAuthExpired = () => {
      setCurrentUser(null);
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, [verifySession]);

  // Load tasks & users
  const loadTasks = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoadingTasks(true);
      const res = await api.getTasks();
      setTasks(res.tasks || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  }, [currentUser]);

  const loadUsers = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await api.getUsers();
      setUsersList(res.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadTasks();
      loadUsers();
    }
  }, [currentUser, loadTasks, loadUsers]);

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setActiveTab('tasks');
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    if (selectedTask && selectedTask.id === updatedTask.id) {
      setSelectedTask(updatedTask);
    }
  };

  const handleTaskCreated = (newTask: Task) => {
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleQuickStatusChange = async (task: Task, newStatus: TaskStatus) => {
    try {
      const res = await api.updateTask(task.id, { status: newStatus });
      handleTaskUpdated(res.task);
    } catch (err: any) {
      alert(`Ошибка обновления статуса: ${err.message}`);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-medium">Проверка сеанса авторизации...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginModal
        onSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-150">
      <Navbar
        user={currentUser}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'tasks' && (
          <TaskListView
            tasks={tasks}
            currentUser={currentUser}
            onSelectTask={(task) => setSelectedTask(task)}
            onCreateTaskClick={() => setShowCreateModal(true)}
            onQuickStatusChange={handleQuickStatusChange}
          />
        )}

        {activeTab === 'audit' && <AuditLogView />}

        {activeTab === 'users' && currentUser.role === 'admin' && (
          <AdminUsersView
            users={usersList}
            currentUser={currentUser}
            onRefreshUsers={loadUsers}
          />
        )}

        {activeTab === 'cli' && currentUser.role === 'admin' && <AdminCliTerminal />}
      </main>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          currentUser={currentUser}
          usersList={usersList}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={handleTaskUpdated}
        />
      )}

      {/* Create Task Modal */}
      {showCreateModal && currentUser.role === 'admin' && (
        <CreateTaskModal
          currentUser={currentUser}
          usersList={usersList}
          onClose={() => setShowCreateModal(false)}
          onTaskCreated={handleTaskCreated}
        />
      )}
    </div>
  );
}
