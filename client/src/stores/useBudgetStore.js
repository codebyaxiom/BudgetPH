import { create } from 'zustand';
import * as api from '../services/api.js';

export const useBudgetStore = create((set, get) => ({
  dashboardData: null,
  proactiveAlerts: [],
  isLoadingDashboard: false,
  isExpenseModalOpen: false,
  isOnboardingOpen: false,

  openExpenseModal: () => set({ isExpenseModalOpen: true }),
  closeExpenseModal: () => set({ isExpenseModalOpen: false }),

  openOnboarding: () => set({ isOnboardingOpen: true }),
  closeOnboarding: () => set({ isOnboardingOpen: false }),

  checkOnboardingStatus: async () => {
    try {
      const res = await api.fetchOnboardingStatus();
      if (res.success && (!res.profile_completed || !res.hasActiveCycle)) {
        set({ isOnboardingOpen: true });
      }
    } catch (err) {
      console.warn('checkOnboardingStatus error:', err);
    }
  },

  loadDashboard: async () => {
    set({ isLoadingDashboard: true });
    try {
      const currentLang = localStorage.getItem('budgetph_lang') || 'en';
      const [dash, alerts] = await Promise.all([
        api.fetchDashboard(),
        api.fetchProactiveAlerts(currentLang)
      ]);
      set({
        dashboardData: dash.success ? dash : null,
        proactiveAlerts: alerts.success ? alerts.alerts : [],
        isLoadingDashboard: false
      });
    } catch (err) {
      console.error('loadDashboard error:', err);
      set({ isLoadingDashboard: false });
    }
  },

  logQuickExpense: async (payload) => {
    const res = await api.logExpense(payload);
    if (res.success) {
      await get().loadDashboard();
    }
    return res;
  }
}));
