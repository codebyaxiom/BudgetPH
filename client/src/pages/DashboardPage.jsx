import React, { useEffect } from 'react';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useLanguageStore } from '../stores/useLanguageStore';
import { Wallet, Calendar, AlertTriangle, CheckCircle2, TrendingUp, ArrowRight, DollarSign, Clock, Sparkles, Receipt } from 'lucide-react';
import * as api from '../services/api';

export function DashboardPage({ setActiveTab }) {
  const { dashboardData, proactiveAlerts, isLoadingDashboard, loadDashboard, openExpenseModal } = useBudgetStore();
  const { t } = useLanguageStore();

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (isLoadingDashboard && !dashboardData) {
    return (
      <div className="py-20 text-center text-slate-400 dark:text-slate-500">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-medium">Kinakalkula ang iyong budget data...</p>
      </div>
    );
  }

  const d = dashboardData || {};
  const activeCycle = d.active_cycle;
  const remainingToday = d.remaining_today || 0;
  const dailyBudget = d.daily_budget || 0;
  const spentToday = d.spent_today || 0;
  const isOverspent = remainingToday < 0;

  const handleMarkPaid = async (obId) => {
    try {
      await api.markObligationPaid({
        obligation_id: obId,
        paid_date: new Date().toISOString().split('T')[0]
      });
      await loadDashboard();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
          {t('welcome_user', { name: d.user?.name || 'Ka-Budget' })}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
          {t('dashboard_subtitle')}
        </p>
      </div>

      {/* Hero Spendable Budget Gauge */}
      <div className={`rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden transition-all ${
        isOverspent
          ? 'bg-gradient-to-br from-red-600 via-rose-600 to-amber-700 dark:from-red-950 dark:via-rose-900 dark:to-slate-900 border border-red-500/30'
          : 'bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 dark:from-emerald-950 dark:via-teal-900 dark:to-slate-900 border border-emerald-500/30'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 dark:bg-white/10 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isOverspent ? t('over_budget_alert') : t('spendable_today_hero')}</span>
            </div>
            <h2 className="text-xs sm:text-sm font-medium opacity-90">
              {isOverspent ? t('overspent_sub') : t('spendable_today_sub')}
            </h2>
            <div className="text-4xl sm:text-6xl font-black tracking-tight my-2 font-['Plus_Jakarta_Sans']">
              ₱{Math.abs(remainingToday).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs sm:text-sm opacity-80">
              {t('daily_limit')}: <strong>₱{Number(dailyBudget).toLocaleString()}</strong> · {t('spent_today')}: <strong>₱{Number(spentToday).toLocaleString()}</strong>
            </p>
          </div>

          <div className="bg-white/10 dark:bg-slate-950/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/20 dark:border-slate-800 flex flex-col gap-2 min-w-[200px]">
            <div className="flex justify-between items-center text-xs">
              <span className="opacity-80">{t('next_payday_in')}</span>
              <span className="font-bold">{t('days_remaining', { days: d.days_until_payday || 0 })}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="opacity-80">{t('total_spendable_rem')}</span>
              <span className="font-bold">₱{Number(d.spendable_remaining || 0).toLocaleString()}</span>
            </div>
            <div className="w-full bg-white/20 dark:bg-slate-800 rounded-full h-2 mt-2">
              <div
                className="bg-white dark:bg-emerald-400 rounded-full h-2 transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, dailyBudget > 0 ? (remainingToday / dailyBudget) * 100 : 0))}%`
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Proactive AI Insight Banner */}
      {proactiveAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-4 sm:p-5 shadow-sm flex items-start gap-3.5">
          <div className="p-2 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl shadow-sm flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-300 font-['Plus_Jakarta_Sans']">
                {t('proactive_insights')}
              </h3>
              <button
                onClick={() => setActiveTab('ai')}
                className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 flex items-center gap-1"
              >
                <span>{t('view_chat')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-1 space-y-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {proactiveAlerts.map((al, idx) => (
                <p key={idx}>
                  <strong className="text-emerald-900 dark:text-emerald-200">[{al.title}]</strong> {al.message.replace(/\*\*/g, '')}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Key Metric Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('stat_income')}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-50">₱{Number(d.total_income || 0).toLocaleString()}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('stat_income_sub')}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('stat_obligations')}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-50">₱{Number(d.obligations_sum || 0).toLocaleString()}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('stat_obligations_sub', { paid: d.paid_obligations || 0, pending: d.pending_obligations || 0 })}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('stat_days_until_payday')}</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{d.days_until_payday || 0} days</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('stat_days_sub')}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('stat_spendable')}</p>
            <p className="text-xl font-bold text-purple-700 dark:text-purple-400">₱{Number(d.spendable_remaining || 0).toLocaleString()}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('stat_spendable_sub')}</p>
          </div>
        </div>

      </div>

      {/* Two Columns: Upcoming Bills & Recent Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Upcoming Bills */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
              {t('upcoming_bills_title')}
            </h3>
            <button onClick={() => setActiveTab('obligations')} className="text-xs font-bold text-green-700 dark:text-green-400 hover:text-green-800">
              {t('manage_all')}
            </button>
          </div>

          <div className="space-y-3">
            {d.upcoming_bills?.length ? (
              d.upcoming_bills.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{b.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('due_every_day', { day: b.due_day, amount: Number(b.amount).toLocaleString() })}
                    </p>
                  </div>
                  {b.is_paid ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center gap-1 border border-blue-200 dark:border-blue-800">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {t('paid_badge')}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleMarkPaid(b.id)}
                      className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
                    >
                      {t('mark_paid')}
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">{t('no_upcoming_bills')}</p>
            )}
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
              {t('recent_expenses')}
            </h3>
            <button onClick={() => setActiveTab('daily')} className="text-xs font-bold text-green-700 dark:text-green-400 hover:text-green-800">
              {t('daily_view')}
            </button>
          </div>

          <div className="space-y-3">
            {d.recent_expenses?.length ? (
              d.recent_expenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{e.description}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {e.expense_date} · <span className="capitalize font-medium">{e.category}</span>
                      {e.mood && (
                        <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold ${
                          e.mood === 'need' ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300' :
                          e.mood === 'want' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                        }`}>
                          {e.mood}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="text-sm font-black text-red-600 dark:text-red-400">
                    -₱{Number(e.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">{t('no_expenses_logged')}</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
