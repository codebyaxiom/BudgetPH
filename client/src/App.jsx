import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LogExpenseModal } from './components/common/LogExpenseModal';
import { FastTrackOnboardingModal } from './components/common/FastTrackOnboardingModal';
import { DashboardPage } from './pages/DashboardPage';
import { DailyPage } from './pages/DailyPage';
import { ReportsPage } from './pages/ReportsPage';
import { PaydayPage } from './pages/PaydayPage';
import { ObligationsPage } from './pages/ObligationsPage';
import { AllowancesPage } from './pages/AllowancesPage';
import { SavingsPage } from './pages/SavingsPage';
import { AIChatPage } from './pages/AIChatPage';
import { SettingsPage } from './pages/SettingsPage';
import { useBudgetStore } from './stores/useBudgetStore';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const { isOnboardingOpen, closeOnboarding, checkOnboardingStatus } = useBudgetStore();

  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-['DM_Sans'] transition-colors duration-200">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />
      
      <div className="flex-1 flex flex-col min-w-0 transition-all">
        <Header activeTab={activeTab} onOpenMobileMenu={() => setIsMobileSidebarOpen(true)} />
        
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
          {activeTab === 'dashboard' && <DashboardPage setActiveTab={setActiveTab} />}
          {activeTab === 'daily' && <DailyPage />}
          {activeTab === 'reports' && <ReportsPage />}
          {activeTab === 'payday' && <PaydayPage setActiveTab={setActiveTab} />}
          {activeTab === 'obligations' && <ObligationsPage />}
          {activeTab === 'allowances' && <AllowancesPage />}
          {activeTab === 'savings' && <SavingsPage />}
          {activeTab === 'ai' && <AIChatPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </main>

        <footer className="py-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-xs text-slate-400 dark:text-slate-500 transition-colors duration-200">
          <p>BudgetPH v2.0 · Pinoy AI Budget Assistant · React 19 + Express</p>
        </footer>
      </div>

      <LogExpenseModal />
      <FastTrackOnboardingModal isOpen={isOnboardingOpen} onClose={closeOnboarding} />
    </div>
  );
}
