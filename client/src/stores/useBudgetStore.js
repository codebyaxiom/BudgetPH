import { create } from 'zustand';
import * as api from '../services/api.js';

export const useBudgetStore = create((set, get) => ({
  dashboardData: null,
  proactiveAlerts: [],
  isLoadingDashboard: false,
  isExpenseModalOpen: false,

  openExpenseModal: () => set({ isExpenseModalOpen: true }),
  closeExpenseModal: () => set({ isExpenseModalOpen: false }),

  loadDashboard: async () => {
    set({ isLoadingDashboard: true });
    try {
      const [dash, alerts] = await Promise.all([
        api.fetchDashboard(),
        api.fetchProactiveAlerts()
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
