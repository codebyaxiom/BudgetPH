import React from 'react';
import { LayoutDashboard, CalendarDays, Receipt, Wallet, Users, Bot, TrendingUp, ShieldCheck, ShoppingBag, Settings, PanelLeftClose, Sparkles } from 'lucide-react';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useLanguageStore } from '../../stores/useLanguageStore';

export function Sidebar({ activeTab, setActiveTab, isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
  const { dashboardData } = useBudgetStore();
  const { t } = useLanguageStore();
  const user = dashboardData?.user;

  const navGroups = [
    {
      title: 'AI Command Center',
      items: [
        { id: 'ai', label: t('ai_advisor'), icon: Bot, isAI: true },
      ]
    },
    {
      title: 'Overview & Visuals',
      items: [
        { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
        { id: 'daily', label: t('daily'), icon: Wallet },
        { id: 'reports', label: t('reports'), icon: TrendingUp },
      ]
    },
    {
      title: 'Planning & Budgets',
      items: [
        { id: 'payday', label: t('payday'), icon: CalendarDays },
        { id: 'obligations', label: t('obligations'), icon: Receipt },
        { id: 'allowances', label: t('allowances'), icon: Users },
        { id: 'wishlist', label: t('wishlist'), icon: ShoppingBag },
        { id: 'savings', label: t('savings'), icon: ShieldCheck },
      ]
    },
    {
      title: 'Settings',
      items: [
        { id: 'settings', label: t('settings'), icon: Settings },
      ]
    }
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 select-none overflow-x-hidden overflow-y-hidden">
      
      {/* Brand Header */}
      <div className={`h-16 flex items-center border-b border-slate-100 dark:border-slate-800 flex-shrink-0 ${
        isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
      }`}>
        {isCollapsed ? (
          <button
            onClick={() => setIsCollapsed(false)}
            title="Expand Sidebar (BudgetPH)"
            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-green-600 to-emerald-500 hover:scale-105 active:scale-95 text-white flex items-center justify-center font-black text-base shadow-md shadow-green-600/30 transition-all cursor-pointer"
          >
            ₱
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2.5 overflow-hidden cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-green-600 to-emerald-500 text-white flex items-center justify-center font-black text-base shadow-md shadow-green-600/20 flex-shrink-0">
                ₱
              </div>
              <div className="truncate animate-in fade-in duration-200">
                <span className="text-base font-black text-slate-900 dark:text-slate-50 tracking-tight font-['Plus_Jakarta_Sans']">
                  Budget<span className="text-green-600 dark:text-green-500">PH</span>
                </span>
                <p className="text-[10px] text-slate-400 font-medium leading-none">Fintech Assistant</p>
              </div>
            </div>

            <button
              onClick={() => setIsCollapsed(true)}
              title="Collapse Sidebar"
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Navigation Links */}
      <div className={`flex-1 py-3 space-y-3.5 overflow-y-auto overflow-x-hidden no-scrollbar ${
        isCollapsed ? 'px-2' : 'px-3'
      }`}>
        {navGroups.map((group, gIdx) => (
          <div key={gIdx}>
            {!isCollapsed && (
              <p className="px-2.5 text-[9px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-1">
                {group.title}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <div key={item.id} className="relative group">
                    <button
                      onClick={() => {
                        setActiveTab(item.id);
                        if (setIsMobileOpen) setIsMobileOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isCollapsed 
                          ? 'w-10 h-10 mx-auto justify-center p-0' 
                          : 'px-3 py-2'
                      } ${
                        isActive
                          ? 'bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-400 shadow-sm border border-green-200/60 dark:border-green-800/60'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${
                        isActive ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'
                      }`} />
                      
                      {!isCollapsed && (
                        <span className="truncate flex-1 text-left text-xs">{item.label}</span>
                      )}

                      {!isCollapsed && item.isAI && (
                        <span className="p-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                          <Sparkles className="w-3 h-3" />
                        </span>
                      )}
                    </button>

                    {/* Tooltip for collapsed rail */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-bold rounded-lg shadow-2xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-slate-700/60">
                        {item.label}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Profile area */}
      <div className="p-2 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
        <div className={`flex items-center gap-2.5 p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 ${
          isCollapsed ? 'justify-center' : ''
        }`}>
          <div className="w-7 h-7 rounded-full bg-green-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          {!isCollapsed && (
            <div className="truncate flex-1">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                {user?.name || 'User'}
              </p>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online
              </span>
            </div>
          )}
        </div>
      </div>

    </div>
  );

  return (
    <>
      <aside className={`hidden md:block sticky top-0 h-screen z-30 transition-all duration-300 ease-in-out overflow-hidden ${
        isCollapsed ? 'w-14' : 'w-56'
      }`}>
        {sidebarContent}
      </aside>

      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex">
          <div className="w-56 h-full animate-in slide-in-from-left duration-200 overflow-hidden">
            {sidebarContent}
          </div>
          <div className="flex-1" onClick={() => setIsMobileOpen(false)}></div>
        </div>
      )}
    </>
  );
}
