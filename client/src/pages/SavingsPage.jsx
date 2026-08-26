import React, { useEffect, useState } from 'react';
import { ShieldCheck, Plus, Sparkles, TrendingUp, CheckCircle2, DollarSign } from 'lucide-react';
import * as api from '../services/api';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useLanguageStore } from '../stores/useLanguageStore';

export function SavingsPage() {
  const { loadDashboard } = useBudgetStore();
  const { language, t } = useLanguageStore();
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
    setIsCreateOpen(false);
    await loadData();
  };

  const goals = data?.goals || [];
  const summary = data?.summary || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
            {t('savings_header')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {t('savings_subheader')}
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('add_savings_goal_btn')}</span>
        </button>
      </div>

      {/* Emergency Fund Benchmark Hero */}
      <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 dark:from-emerald-950 dark:via-teal-950 dark:to-slate-950 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 dark:bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Emergency Fund Coverage</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black font-['Plus_Jakarta_Sans']">
              {t('emergency_coverage_months', { months: summary.emergencyFundMonths || 0 })}
            </h2>
            <p className="text-xs sm:text-sm opacity-80 max-w-lg">
              {t('emergency_desc', { amount: Number(summary.monthlyBillsBenchmark || 0).toLocaleString() })}
            </p>
          </div>

          <div className="bg-white/10 dark:bg-slate-900/60 backdrop-blur-md p-5 rounded-2xl border border-white/20 dark:border-slate-800 min-w-[220px]">
            <p className="text-xs opacity-80">{t('total_saved_all_goals')}</p>
            <p className="text-2xl sm:text-3xl font-black mt-1">₱{Number(summary.totalCurrent || 0).toLocaleString()}</p>
            <p className="text-[11px] opacity-70 mt-1">Target: ₱{Number(summary.totalTarget || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Goal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((g) => (
          <div key={g.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{g.name}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {g.type.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  {g.progress_pct}%
                </span>
              </div>

              <div className="my-4">
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-500">{t('saved_progress_label')}</span>
                  <span className="text-slate-900 dark:text-slate-50">₱{Number(g.current_amount).toLocaleString()} / ₱{Number(g.target_amount).toLocaleString()}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3">
                  <div
                    className="bg-emerald-500 rounded-full h-3 transition-all duration-500"
                    style={{ width: `${g.progress_pct}%` }}
                  ></div>
                </div>
              </div>

              {g.per_payday_contribution > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('auto_allocation_desc', { amount: Number(g.per_payday_contribution).toLocaleString() })}
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
              <button
                onClick={() => {
                  setSelectedGoal(g);
                  setIsDepositOpen(true);
                }}
                className="w-full py-2 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-xl border border-emerald-200 dark:border-emerald-800/60 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('deposit_btn')}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Deposit Modal */}
      {isDepositOpen && selectedGoal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 mb-1 font-['Plus_Jakarta_Sans']">
              Mag-ipon para sa "{selectedGoal.name}"
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Kasalukuyang naipon: ₱{Number(selectedGoal.current_amount).toLocaleString()}
            </p>

            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Halaga ng Ipon (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 font-bold text-lg"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDepositOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-xs font-bold text-white bg-green-600 rounded-xl">
                  Confirm Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Goal Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 mb-4 font-['Plus_Jakarta_Sans']">
              Lumikha ng Bagong Savings Goal
            </h3>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Pangalan ng Goal</label>
                <input
                  type="text"
                  required
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  placeholder="e.g. Christmas Bonus Jar, Laptop Upgrade, Emergency Fund"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Target Amount (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    placeholder="50000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Uri (Type)</label>
                  <select
                    value={goalType}
                    onChange={(e) => setGoalType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm"
                  >
                    <option value="regular">Regular Goal</option>
                    <option value="emergency_fund">Emergency Fund</option>
                    <option value="sinking_fund">Sinking Fund</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Kada Sahod (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={goalPerPayday}
                    onChange={(e) => setGoalPerPayday(e.target.value)}
                    placeholder="1000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Target Date</label>
                  <input
                    type="date"
                    value={goalDate}
                    onChange={(e) => setGoalDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-xs font-bold text-white bg-green-600 rounded-xl">
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
