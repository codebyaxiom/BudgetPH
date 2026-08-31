import React from 'react';
import { Menu, Sun, Moon, PlusCircle, Globe } from 'lucide-react';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { useLanguageStore } from '../../stores/useLanguageStore';

export function Header({ activeTab, onOpenMobileMenu, setActiveTab }) {
  const { dashboardData, openExpenseModal } = useBudgetStore();
  const { theme, toggleTheme } = useThemeStore();
  const { language, setLanguage, toggleLanguage, t } = useLanguageStore();
  const activeCycle = dashboardData?.active_cycle;

  const pageTitles = {
    dashboard: t('dashboard'),
    daily: t('daily'),
    calendar: t('calendar'),
    reports: t('reports'),
    payday: t('payday'),
    obligations: t('obligations'),
    allowances: t('allowances'),
    wishlist: t('wishlist'),
    savings: t('savings'),
    ai: t('ai_advisor'),
    settings: t('settings'),
  };

  return (
    <header className="sticky top-0 z-20 h-14 sm:h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-8 flex items-center justify-between transition-colors duration-200">
      
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex-shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-sm sm:text-lg font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans'] tracking-tight truncate max-w-[110px] xs:max-w-[170px] sm:max-w-none">
          {pageTitles[activeTab] || 'Dashboard'}
        </h1>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
        {activeCycle && (
          <button
            onClick={() => setActiveTab && setActiveTab('payday')}
            title={language === 'tl' 
              ? `Aktibong Sahod Cut-off: ₱${Number(activeCycle.expected_amount).toLocaleString()} (I-click para sa Payday Simulator)` 
              : `Active Payday Cut-off: ₱${Number(activeCycle.expected_amount).toLocaleString()} (Click to open Payday Simulator)`}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/60 rounded-full text-xs font-semibold text-emerald-800 dark:text-emerald-300 shadow-xs transition cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{t('active_cycle')}: <strong>₱{Number(activeCycle.expected_amount).toLocaleString()}</strong></span>
          </button>
        )}

        {/* Obvious Language Switcher Pill */}
        <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs font-bold shadow-inner">
          <button
            onClick={() => setLanguage('en')}
            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              language === 'en'
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            title="Switch language to English"
          >
            <span className="text-xs">🇺🇸</span>
            <span className="text-[10px] sm:text-[11px]">EN</span>
          </button>
          <button
            onClick={() => setLanguage('tl')}
            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              language === 'tl'
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            title="Switch language to Tagalog / Filipino"
          >
            <span className="text-xs">🇵🇭</span>
            <span className="text-[10px] sm:text-[11px]">TL</span>
          </button>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          )}
        </button>

        {/* Quick Log Expense Button */}
        <button
          onClick={openExpenseModal}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline">{t('log_expense')}</span>
        </button>
      </div>

    </header>
  );
}
