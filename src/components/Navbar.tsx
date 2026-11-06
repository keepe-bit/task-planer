import React from 'react';
import { User } from '../types';
import { 
  ClipboardList, 
  History, 
  Users, 
  Terminal, 
  LogOut, 
  Shield, 
  User as UserIcon,
  Sun,
  Moon
} from 'lucide-react';

interface NavbarProps {
  user: User;
  activeTab: 'tasks' | 'audit' | 'users' | 'cli';
  onSelectTab: (tab: 'tasks' | 'audit' | 'users' | 'cli') => void;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  onSelectTab,
  onLogout,
  darkMode,
  onToggleDarkMode,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            TP
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
              TaskPlaner
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 block -mt-1 font-mono">
              Enterprise v1.2
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <button
            onClick={() => onSelectTab('tasks')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'tasks'
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Заявки</span>
          </button>

          <button
            onClick={() => onSelectTab('audit')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Журнал аудита</span>
          </button>

          {user.role === 'admin' && (
            <>
              <button
                onClick={() => onSelectTab('users')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'users'
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Пользователи</span>
              </button>

              <button
                onClick={() => onSelectTab('cli')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'cli'
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span>CLI Консоль</span>
              </button>
            </>
          )}
        </nav>

        {/* Zone 3: Account Info & Quick Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggleDarkMode}
            aria-label="Переключить тему"
            className="p-2 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-xs">
            {user.role === 'admin' ? (
              <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <UserIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
            <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate max-w-[130px]">
              {user.full_name || user.username}
            </span>
            <span className="text-zinc-400">·</span>
            <span className="uppercase text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
              {user.role === 'admin' ? 'Админ' : 'Пользователь'}
            </span>
          </div>

          <button
            onClick={onLogout}
            title="Выйти из системы"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-rose-200 dark:hover:border-rose-900 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Выход</span>
          </button>
        </div>
      </div>

      {/* Mobile subnavigation */}
      <div className="md:hidden flex items-center border-t border-zinc-200 dark:border-zinc-800 px-4 py-2 gap-2 overflow-x-auto">
        <button
          onClick={() => onSelectTab('tasks')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${
            activeTab === 'tasks' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-zinc-600 dark:text-zinc-400'
          }`}
        >
          Заявки
        </button>
        <button
          onClick={() => onSelectTab('audit')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${
            activeTab === 'audit' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-zinc-600 dark:text-zinc-400'
          }`}
        >
          Аудит
        </button>
        {user.role === 'admin' && (
          <>
            <button
              onClick={() => onSelectTab('users')}
              className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${
                activeTab === 'users' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Пользователи
            </button>
            <button
              onClick={() => onSelectTab('cli')}
              className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${
                activeTab === 'cli' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              CLI
            </button>
          </>
        )}
      </div>
    </header>
  );
};
