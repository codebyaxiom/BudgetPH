const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(url, config);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
  }
  return res.json();
}

// Onboarding
export const fetchOnboardingStatus = () => request('/onboarding/status');
export const completeFastTrackOnboarding = (payload) => request('/onboarding/fast-track', { method: 'POST', body: payload });

// Dashboard
export const fetchDashboard = () => request('/dashboard');


// Payday
export const fetchPaydaySetup = () => request('/payday/setup');
export const simulatePayday = (payload) => request('/payday/simulate', { method: 'POST', body: payload });
export const fetchPaydayCycles = () => request('/payday/cycles');

// Expenses
export const fetchDailyData = () => request('/expenses/daily');
export const fetchAllExpenses = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/expenses/all${query ? `?${query}` : ''}`);
};
export const logExpense = (payload) => request('/expenses', { method: 'POST', body: payload });
export const deleteExpense = (id) => request(`/expenses/${id}`, { method: 'DELETE' });

// Obligations
export const fetchObligations = () => request('/obligations');
export const saveObligation = (payload) => request('/obligations', { method: 'POST', body: payload });
export const markObligationPaid = (payload) => request('/obligations/pay', { method: 'POST', body: payload });
export const unmarkObligationPaid = (id) => request('/obligations/unpay', { method: 'POST', body: { obligation_id: id } });
export const deleteObligation = (id) => request(`/obligations/${id}`, { method: 'DELETE' });

// Allowances
export const fetchAllowances = () => request('/allowances');
export const addFamilyMember = (payload) => request('/allowances/member', { method: 'POST', body: payload });
export const updateFamilyMember = (id, payload) => request(`/allowances/member/${id}`, { method: 'PUT', body: payload });
export const deleteFamilyMember = (id) => request(`/allowances/member/${id}`, { method: 'DELETE' });
export const saveAllowance = (payload) => request('/allowances/save', { method: 'POST', body: payload });
export const deleteAllowance = (id) => request(`/allowances/${id}`, { method: 'DELETE' });

// Wishlist & Wants Delay Buffer
export const fetchWishlist = () => request('/wishlist');
export const addWishlistItem = (payload) => request('/wishlist', { method: 'POST', body: payload });
export const buyWishlistItem = (id, logAsExpense = true) => request(`/wishlist/${id}/purchase`, { method: 'POST', body: { log_as_expense: logAsExpense } });
export const deleteWishlistItem = (id) => request(`/wishlist/${id}`, { method: 'DELETE' });

// Savings & Goals
export const fetchSavings = () => request('/savings');
export const createSavingsGoal = (payload) => request('/savings', { method: 'POST', body: payload });
export const depositToSavings = (payload) => request('/savings/deposit', { method: 'POST', body: payload });
export const deleteSavingsGoal = (id) => request(`/savings/${id}`, { method: 'DELETE' });

// Reports & Analytics
export const fetchAnalytics = () => request('/reports/analytics');

// Settings & Profile
export const fetchSettings = () => request('/settings');
export const updateProfile = (payload) => request('/settings/profile', { method: 'POST', body: payload });
export const exportData = () => request('/settings/export');

// AI Chat & Model Training Dataset
export const fetchAIHistory = (channel = 'general') => request(`/ai/history?channel=${channel}`);
export const fetchProactiveAlerts = (lang = 'en') => request(`/ai/alerts?lang=${lang}`);
export const sendAIMessage = (message, lang = 'en', mode = 'auto', channel = 'general') => 
  request('/ai/message', { method: 'POST', body: { message, lang, mode, channel } });
export const clearAIHistory = (channel = 'general') => 
  request(`/ai/history?channel=${channel}`, { method: 'DELETE' });
export const submitAIFeedback = (payload) => 
  request('/ai/feedback', { method: 'POST', body: payload });
export const exportAITrainingData = () => request('/ai/export-training-data');
