import express from 'express';
import * as dashboard from '../controllers/dashboardController.js';
import * as payday from '../controllers/paydayController.js';
import * as expenses from '../controllers/expensesController.js';
import * as obligations from '../controllers/obligationsController.js';
import * as allowances from '../controllers/allowancesController.js';
import * as savings from '../controllers/savingsController.js';
import * as reports from '../controllers/reportsController.js';
import * as settings from '../controllers/settingsController.js';
import * as wishlist from '../controllers/wishlistController.js';
import * as calendar from '../controllers/calendarController.js';
import * as onboarding from '../controllers/onboardingController.js';
import * as ai from '../controllers/aiController.js';

const router = express.Router();

// Calendar
router.get('/calendar', calendar.getMonthCalendarData);

// Onboarding
router.get('/onboarding/status', onboarding.getOnboardingStatus);
router.post('/onboarding/fast-track', onboarding.completeFastTrackOnboarding);

// Dashboard
router.get('/dashboard', dashboard.getDashboard);

// Payday
router.get('/payday/setup', payday.getPaydaySetup);
router.post('/payday/simulate', payday.simulatePayday);
router.get('/payday/cycles', payday.getPaydayCycles);

// Expenses
router.get('/expenses/daily', expenses.getDailyData);
router.get('/expenses/all', expenses.getAllExpenses);
router.post('/expenses', expenses.logExpense);
router.delete('/expenses/:id', expenses.deleteExpense);

// Obligations
router.get('/obligations', obligations.getObligations);
router.post('/obligations', obligations.saveObligation);
router.post('/obligations/pay', obligations.markPaid);
router.post('/obligations/unpay', obligations.unmarkPaid);
router.delete('/obligations/:id', obligations.deleteObligation);

// Allowances
router.get('/allowances', allowances.getAllowances);
router.post('/allowances/member', allowances.addFamilyMember);
router.put('/allowances/member/:id', allowances.updateFamilyMember);
router.delete('/allowances/member/:id', allowances.deleteFamilyMember);
router.post('/allowances/save', allowances.saveAllowance);
router.delete('/allowances/:id', allowances.deleteAllowance);

// Wishlist & Wants Buffer
router.get('/wishlist', wishlist.getWishlist);
router.post('/wishlist', wishlist.addWishlistItem);
router.post('/wishlist/:id/purchase', wishlist.markWishlistPurchased);
router.delete('/wishlist/:id', wishlist.deleteWishlistItem);

// Savings & Goals
router.get('/savings', savings.getSavings);
router.post('/savings', savings.createGoal);
router.post('/savings/deposit', savings.depositToGoal);
router.delete('/savings/:id', savings.deleteGoal);

// Reports & Analytics
router.get('/reports/analytics', reports.getAnalytics);

// Settings & Profile
router.get('/settings', settings.getSettings);
router.post('/settings/profile', settings.updateProfile);
router.get('/settings/export', settings.exportData);

// AI Chat & Training Dataset
router.get('/ai/history', ai.getHistory);
router.get('/ai/alerts', ai.getProactiveAlerts);
router.post('/ai/message', ai.sendMessage);
router.post('/ai/feedback', ai.submitFeedback);
router.get('/ai/export-training-data', ai.exportTrainingDataset);
router.delete('/ai/history', ai.clearHistory);

export default router;
