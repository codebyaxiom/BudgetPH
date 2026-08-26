import React from 'react';
import { Menu, Sun, Moon, PlusCircle } from 'lucide-react';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useThemeStore } from '../../stores/useThemeStore';

export function Header({ activeTab, onOpenMobileMenu }) {
  const { dashboardData, openExpenseModal } = useBudgetStore();
  const { theme, toggleTheme } = useThemeStore();
  const activeCycle = dashboardData?.active_cycle;

  const pageTitles = {
    dashboard: 'Financial Dashboard',
    daily: 'Pang-Araw-Araw na Gastos',
    reports: 'Financial Health & Analytics',
    payday: 'Payday Simulator 2.0',
    obligations: 'Fixed & Variable Obligations',
    allowances: 'Family Member Allowances',
    savings: 'Ipon & Emergency Fund Goals',
    ai: 'AI Budget Advisor Copilot',
    settings: 'Settings & Data Backup',
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between transition-colors duration-200">
      
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans'] tracking-tight">
          {pageTitles[activeTab] || 'Dashboard'}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {activeCycle && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 rounded-full text-xs font-semibold text-emerald-800 dark:text-emerald-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Active: <strong>₱{Number(activeCycle.expected_amount).toLocaleString()}</strong></span>
          </div>
        )}

        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-90 duration-200" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700 animate-in spin-in-90 duration-200" />
          )}
        </button>

        <button
          onClick={openExpenseModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-green-600/25 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Log Gastos</span>
        </button>
      </div>

    </header>
  );
}
