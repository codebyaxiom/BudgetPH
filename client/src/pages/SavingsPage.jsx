import React, { useEffect, useState } from 'react';
import { ShieldCheck, Plus, Sparkles, TrendingUp, CheckCircle2, DollarSign, Trash2, PiggyBank, Target } from 'lucide-react';
import * as api from '../services/api';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useLanguageStore } from '../stores/useLanguageStore';

const GOAL_TYPES = {
  emergency_fund: { en: 'Emergency Fund', tl: 'Emergency Fund (Pondo sa Sakuna)' },
  regular: { en: 'Sinking Fund / Goal', tl: 'Target na Ipon (Sinking Fund)' },
  vacation: { en: 'Travel & Vacation', tl: 'Bakasyon / Travel' },
  education: { en: 'Tuition & Education', tl: 'Edukasyon / Matrikula' },
  investment: { en: 'Investment Seed', tl: 'Puhunan / Investment' }
};

export function SavingsPage() {
  const { loadDashboard } = useBudgetStore();
  const { language, t } = useLanguageStore();
  const isTL = language === 'tl';

  const [data, setData] = useState(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  
  const [goalName, setGoalName] = useState('');
  const [goalType, setGoalType] = useState('regular');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalPerPayday, setGoalPerPayday] = useState('');
  const [goalDate, setGoalDate] = useState('');

  const loadData = async () => {
    const res = await api.fetchSavings();
    if (res.success) setData(res);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!selectedGoal || !depositAmount) return;

    await api.depositToSavings({
      goal_id: selectedGoal.id,
      amount: parseFloat(depositAmount)
    });
    setDepositAmount('');
    setIsDepositOpen(false);
    await loadData();
    await loadDashboard();
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!goalName || !goalTarget) return;

    await api.createSavingsGoal({
      name: goalName,
      type: goalType,
      target_amount: parseFloat(goalTarget),
      per_payday_contribution: parseFloat(goalPerPayday || 0),
      target_date: goalDate || null
    });
    setGoalName('');
    setGoalTarget('');
    setGoalPerPayday('');
    setGoalDate('');
    setIsCreateOpen(false);
    await loadData();
    await loadDashboard();
  };

  const handleDeleteGoal = async (goal) => {
    const confirmMsg = isTL 
      ? `Sigurado ka bang nais mong tanggalin ang goal na "${goal.name}"?` 
      : `Are you sure you want to delete the goal "${goal.name}"?`;

    if (!confirm(confirmMsg)) return;

    await api.deleteSavingsGoal(goal.id);
    await loadData();
    await loadDashboard();
  };

  const goals = data?.goals || [];
  const summary = data?.summary || {};

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans'] flex items-center gap-2.5">
            <span>{t('savings_header')}</span>
            <span>🏦</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {t('savings_subheader')}
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t('add_savings_goal_btn')}</span>
        </button>
      </div>

      {/* Emergency Fund Benchmark Hero */}
      <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 dark:from-emerald-950 dark:via-teal-950 dark:to-slate-950 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 dark:bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>{isTL ? 'EMERGENCY FUND COVERAGE' : 'EMERGENCY FUND COVERAGE'}</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black font-['Plus_Jakarta_Sans'] tracking-tight">
              {t('emergency_coverage_months', { months: summary.emergencyFundMonths || 0 })}
            </h2>
            <p className="text-xs sm:text-sm opacity-80 max-w-lg leading-relaxed">
              {t('emergency_desc', { amount: Number(summary.monthlyBillsBenchmark || 0).toLocaleString() })}
            </p>
          </div>

          <div className="bg-white/10 dark:bg-slate-900/60 backdrop-blur-md p-5 rounded-2xl border border-white/20 dark:border-slate-800 min-w-[220px]">
            <p className="text-xs opacity-80">{t('total_saved_all_goals')}</p>
            <p className="text-2xl sm:text-3xl font-black font-['Plus_Jakarta_Sans'] mt-1">
              ₱{Number(summary.totalCurrent || 0).toLocaleString()}
            </p>
            <p className="text-[11px] opacity-70 mt-1 font-medium">
              Target: ₱{Number(summary.totalTarget || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Ambient glow */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Goal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {goals.map((g) => {
          const typeLabel = GOAL_TYPES[g.type]?.[language] || g.type.replace('_', ' ');

          return (
            <div 
              key={g.id} 
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-800/80 transition"
            >
              <div>
                <div className="flex justify-between items-start mb-3 gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug">
                      {g.name}
                    </h3>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 mt-1">
                      {typeLabel}
                    </span>
                  </div>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-['Plus_Jakarta_Sans']">
                    {g.progress_pct}%
                  </span>
                </div>

                <div className="my-4">
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-500">{t('saved_progress_label')}</span>
                    <span className="text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans'] font-extrabold">
                      ₱{Number(g.current_amount).toLocaleString()} / ₱{Number(g.target_amount).toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 rounded-full h-2.5 transition-all duration-500"
                      style={{ width: `${Math.min(100, g.progress_pct)}%` }}
                    ></div>
                  </div>
                </div>

                {g.per_payday_contribution > 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {t('auto_allocation_desc', { amount: Number(g.per_payday_contribution).toLocaleString() })}
                  </p>
                )}
              </div>

              {/* Card Actions */}
              <div className="pt-3.5 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedGoal(g);
                    setIsDepositOpen(true);
                  }}
                  className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl border border-emerald-200 dark:border-emerald-800/60 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('deposit_btn')}</span>
                </button>

                <button
                  onClick={() => handleDeleteGoal(g)}
                  className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                  title={isTL ? 'Tanggalin ang goal' : 'Delete savings goal'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deposit Modal */}
      {isDepositOpen && selectedGoal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 mb-1 font-['Plus_Jakarta_Sans']">
              {isTL ? `Mag-ipon para sa "${selectedGoal.name}"` : `Deposit to "${selectedGoal.name}"`}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {isTL ? `Kasalukuyang naipon: ₱${Number(selectedGoal.current_amount).toLocaleString()}` : `Current saved: ₱${Number(selectedGoal.current_amount).toLocaleString()}`}
            </p>

            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  {isTL ? 'Halaga ng Ipon (₱)' : 'Deposit Amount (₱)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="500.00"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 font-extrabold font-['Plus_Jakarta_Sans'] text-xl focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDepositOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  {isTL ? 'Kanselahin' : 'Cancel'}
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition cursor-pointer"
                >
                  {isTL ? 'Kumpirmahin' : 'Confirm Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Goal Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-1 font-['Plus_Jakarta_Sans']">
              {isTL ? 'Magdagdag ng Target na Ipon 🎯' : 'Add New Savings Goal 🎯'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {isTL ? 'Mag-set ng target amount at auto-allocation kada cut-off sahod.' : 'Set target goal amount and automated allocation per payday.'}
            </p>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  {isTL ? 'Pangalan ng Goal / Target' : 'Goal Name'}
                </label>
                <input
                  type="text"
                  required
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  placeholder={isTL ? 'hal. Emergency Fund, Tuition Fee, Pambili ng Motor' : 'e.g. Emergency Fund, Tuition Fee, Vacation'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                    {isTL ? 'Target Amount (₱)' : 'Target Amount (₱)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    placeholder="50000.00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 font-black text-base focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                    {isTL ? 'Kategorya ng Goal' : 'Goal Type'}
                  </label>
                  <select
                    value={goalType}
                    onChange={(e) => setGoalType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm font-semibold"
                  >
                    <option value="emergency_fund">Emergency Fund (Safety Net)</option>
                    <option value="regular">Sinking Fund / General Goal</option>
                    <option value="vacation">Travel & Vacation</option>
                    <option value="education">Tuition & Education</option>
                    <option value="investment">Investment Seed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  {isTL ? 'Auto-Allocation Kada Sahod (₱)' : 'Auto-Allocation per Payday (₱)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={goalPerPayday}
                  onChange={(e) => setGoalPerPayday(e.target.value)}
                  placeholder={isTL ? 'hal. 1000.00' : 'e.g. 1000.00'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm font-semibold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer"
                >
                  {isTL ? 'Kanselahin' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition cursor-pointer"
                >
                  {isTL ? 'Lumikha ng Goal' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
