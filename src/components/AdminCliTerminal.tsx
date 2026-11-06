import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Send, Copy, Trash2, HelpCircle, Check, Play } from 'lucide-react';
import { api } from '../services/api';

export const AdminCliTerminal: React.FC = () => {
  const [command, setCommand] = useState('user list');
  const [history, setHistory] = useState<Array<{ cmd: string; output: string; exitCode: number; time: string }>>([
    {
      cmd: 'user list',
      output: 'Системная консоль Python cli.py готова к работе.\nВведите команду или выберите один из быстрых шаблонов ниже.',
      exitCode: 0,
      time: new Date().toLocaleTimeString(),
    },
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [submittedCommands, setSubmittedCommands] = useState<string[]>(['user list']);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const runCommand = async (cmdToRun: string) => {
    const trimmed = cmdToRun.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const res = await api.executeCli(trimmed);
      setHistory((prev) => [
        ...prev,
        {
          cmd: trimmed,
          output: res.output,
          exitCode: res.exit_code,
          time: new Date().toLocaleTimeString(),
        },
      ]);
      setSubmittedCommands((prev) => [...prev, trimmed]);
      setHistoryIndex(-1);
    } catch (err: any) {
      setHistory((prev) => [
        ...prev,
        {
          cmd: trimmed,
          output: `Ошибка выполнения: ${err.message}`,
          exitCode: 1,
          time: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    runCommand(command);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (submittedCommands.length === 0) return;
      const nextIdx = historyIndex === -1 ? submittedCommands.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setCommand(submittedCommands[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx >= submittedCommands.length) {
        setHistoryIndex(-1);
        setCommand('');
      } else {
        setHistoryIndex(nextIdx);
        setCommand(submittedCommands[nextIdx]);
      }
    }
  };

  const copyAllOutput = () => {
    const text = history.map((h) => `$ python3 cli.py ${h.cmd}\n${h.output}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearTerminal = () => {
    setHistory([]);
  };

  const presets = [
    { label: 'Список пользователей', cmd: 'user list' },
    { label: 'Список задач', cmd: 'task list' },
    { label: 'Журнал аудита', cmd: 'audit list --limit 10' },
    { label: 'Создать инженера', cmd: 'user add petrov Pass12345! --name "Петров П.П." --role user' },
    { label: 'Заблокировать', cmd: 'user block petrov' },
    { label: 'Разблокировать', cmd: 'user unblock petrov' },
    { label: 'Справка по командам', cmd: '--help' },
  ];

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Командная строка администрирования (CLI)
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Прямое взаимодействие с утилитой <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[11px]">python3 cli.py</code> для создания учеток и управления правами доступа
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyAllOutput}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition"
            title="Скопировать весь вывод"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Скопировано' : 'Копировать'}</span>
          </button>
          <button
            onClick={clearTerminal}
            className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
            title="Очистить терминал"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1">
          <Play className="w-3 h-3 text-indigo-500" />
          <span>Быстрые шаблоны команд:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCommand(p.cmd);
                runCommand(p.cmd);
              }}
              className="px-2.5 py-1 text-xs font-mono rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal Screen */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-200 overflow-hidden shadow-lg font-mono text-xs">
        {/* Terminal Title Bar */}
        <div className="bg-zinc-900/90 px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
            <span className="ml-2 text-zinc-400 text-[11px]">task-planer@server: python3 cli.py</span>
          </div>
          <div className="text-[10px] text-zinc-500">Bash / Python 3.10</div>
        </div>

        {/* Terminal Body */}
        <div className="p-4 space-y-4 max-h-[460px] overflow-y-auto leading-relaxed">
          {history.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
                <span className="text-emerald-400">root@task-planer:~#</span>
                <span className="text-zinc-100 font-semibold">python3 cli.py {item.cmd}</span>
                <span className="text-zinc-600 text-[10px] ml-auto">{item.time}</span>
              </div>
              <pre className="text-zinc-300 whitespace-pre-wrap pl-2 border-l border-zinc-800/80 text-[12px]">
                {item.output}
              </pre>
            </div>
          ))}
          <div ref={terminalEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="border-t border-zinc-800 bg-zinc-900/60 p-2.5 flex items-center gap-2">
          <span className="text-emerald-400 font-bold pl-2 select-none">$</span>
          <span className="text-zinc-400 select-none">python3 cli.py</span>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="user list | user add <login> <pass> | user block <login> | audit list"
            disabled={loading}
            className="flex-1 bg-transparent text-zinc-100 focus:outline-none placeholder:text-zinc-600 text-xs font-mono"
          />
          <button
            type="submit"
            disabled={loading || !command.trim()}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-sans font-medium flex items-center gap-1 transition disabled:opacity-40"
          >
            {loading ? <span className="animate-spin">...</span> : <Send className="w-3.5 h-3.5" />}
            <span>Выполнить</span>
          </button>
        </form>
      </div>

      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between px-1">
        <span>Подсказка: используйте стрелки клавиатуры ↑ и ↓ для навигации по истории введенных команд.</span>
        <span>Код возврата последнего вызова: <code className="font-mono">{history.length > 0 ? history[history.length - 1].exitCode : 0}</code></span>
      </div>
    </div>
  );
};
