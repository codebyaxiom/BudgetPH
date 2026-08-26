import React from 'react';
import { LayoutDashboard, CalendarDays, Receipt, Wallet, Users, Bot, PlusCircle, Sun, Moon } from 'lucide-react';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useThemeStore } from '../../stores/useThemeStore';

export function Navbar({ activeTab, setActiveTab }) {
  const { dashboardData, openExpenseModal } = useBudgetStore();
  const { theme, toggleTheme } = useThemeStore();
  const activeCycle = dashboardData?.active_cycle;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'daily', label: 'Daily Gastos', icon: Wallet },
    { id: 'payday', label: 'Payday Sim', icon: CalendarDays },
    { id: 'obligations', label: 'Obligations', icon: Receipt },
    { id: 'allowances', label: 'Allowances', icon: Users },
    { id: 'ai', label: 'AI Copilot', icon: Bot },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-green-600 to-emerald-500 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-green-600/20">
              ₱
            </div>
            <div>
              <span className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                Budget<span className="text-green-600 dark:text-green-500">PH</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-100 dark:bg-green-950/80 text-green-800 dark:text-green-300 rounded uppercase tracking-wider border border-green-200 dark:border-green-800/60">v2.0</span>
              </span>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Smart Filipino Budgeting</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-green-700 dark:text-green-400 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 transition-all"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-90 duration-200" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 animate-in spin-in-90 duration-200" />
              )}
            </button>

            {activeCycle ? (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 rounded-full text-xs font-medium text-emerald-800 dark:text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active: <strong>₱{Number(activeCycle.expected_amount).toLocaleString()}</strong></span>
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 rounded-full text-xs font-medium text-amber-800 dark:text-amber-300">
                <span>No active cycle</span>
              </div>
            )}

            <button
              onClick={openExpenseModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-green-600/25 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Log Gastos</span>
            </button>
          </div>

        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-100 dark:border-slate-800 overflow-x-auto gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg text-[10px] font-medium ${
                  isActive ? 'text-green-600 dark:text-green-400 font-bold' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
}
