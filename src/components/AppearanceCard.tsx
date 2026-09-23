import { Monitor, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export function AppearanceCard() {
  const { theme, toggleTheme, setTheme } = useTheme();

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] shadow-sm transition-colors">
      <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <Monitor className="w-5 h-5 text-sky-500" />
        Appearance
      </h3>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {theme === 'dark'
              ? 'Switch to light for a brighter look'
              : 'Switch to dark for easier night use'}
          </p>
        </div>

        {/* Toggle switch pill */}
        <button
          type="button"
          onClick={(e) => toggleTheme(e)}
          aria-label="Toggle dark/light mode"
          className={`relative w-16 h-8 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 ${
            theme === 'dark'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600'
              : 'bg-gradient-to-r from-sky-400 to-cyan-400'
          }`}
        >
          <span
            className={`absolute top-1 w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ${
              theme === 'dark' ? 'translate-x-8 bg-slate-900' : 'translate-x-1 bg-white'
            }`}
          >
            {theme === 'dark' ? (
              <Moon className="w-3.5 h-3.5 text-indigo-300" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-500" />
            )}
          </span>
        </button>
      </div>

      {/* Visual preview tiles */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={(e) => setTheme('light', e)}
          className={`p-3 rounded-xl border-2 transition-all cursor-pointer text-left ${
            theme === 'light'
              ? 'border-sky-500 bg-sky-50'
              : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20'
          }`}
        >
          <div className="w-full h-8 rounded-lg bg-gradient-to-br from-slate-100 to-white border border-slate-200 mb-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]" />
          <p className={`text-xs font-medium text-center ${theme === 'light' ? 'text-sky-600 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
            Light
          </p>
        </button>

        <button
          type="button"
          onClick={(e) => setTheme('dark', e)}
          className={`p-3 rounded-xl border-2 transition-all cursor-pointer text-left ${
            theme === 'dark'
              ? 'border-indigo-500 bg-indigo-950/30'
              : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20'
          }`}
        >
          <div className="w-full h-8 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 dark:border-white/10 mb-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]" />
          <p className={`text-xs font-medium text-center ${theme === 'dark' ? 'text-indigo-400 font-semibold' : 'text-slate-400'}`}>
            Dark
          </p>
        </button>
      </div>
    </div>
  );
}
