import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, DollarSign, Zap, Home, Wifi, Droplets, CreditCard, Smartphone, Check, ArrowRight, ShieldCheck, Globe, X } from 'lucide-react';
import * as api from '../../services/api';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useLanguageStore } from '../../stores/useLanguageStore';

const DRAFT_KEY = 'budgetph_onboarding_draft_v1';

const defaultBillsList = [
  { id: 'electricity', labelKey: 'bill_electricity', defaultName: 'Electricity Bill', category: 'electricity', amount: 2500, due_day: 18, selected: true, icon: Zap },
  { id: 'rent', labelKey: 'bill_rent', defaultName: 'House Rent', category: 'rent', amount: 5000, due_day: 1, selected: true, icon: Home },
  { id: 'internet', labelKey: 'bill_internet', defaultName: 'Internet / Wifi', category: 'internet', amount: 1500, due_day: 25, selected: true, icon: Wifi },
  { id: 'water', labelKey: 'bill_water', defaultName: 'Water Bill', category: 'water', amount: 500, due_day: 22, selected: true, icon: Droplets },
  { id: 'loan', labelKey: 'bill_loan', defaultName: 'Loans & Cards', category: 'credit_card', amount: 1500, due_day: 5, selected: false, icon: CreditCard },
  { id: 'phone', labelKey: 'bill_phone', defaultName: 'Phone & Load', category: 'subscriptions', amount: 500, due_day: 15, selected: false, icon: Smartphone },
];

export function FastTrackOnboardingModal({ isOpen, onClose }) {
  const { loadDashboard } = useBudgetStore();
  const { language, setLanguage, t } = useLanguageStore();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize from LocalStorage draft if available
  const getInitialDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse onboarding draft:', e);
    }
    return null;
  };

  const initialDraft = getInitialDraft();

  // Screen 1: Profile & Income
  const [name, setName] = useState(initialDraft?.name || '');
  const [incomeAmount, setIncomeAmount] = useState(initialDraft?.incomeAmount || '25000');
  const [frequency, setFrequency] = useState(initialDraft?.frequency || 'semi-monthly');
  
  // Default next payday (calculate 15th or end of month)
  const today = new Date();
  const defaultNextPayday = new Date();
  if (today.getDate() < 15) {
    defaultNextPayday.setDate(15);
  } else {
    defaultNextPayday.setMonth(defaultNextPayday.getMonth() + 1, 0);
  }
  const [nextPaydayDate, setNextPaydayDate] = useState(
    initialDraft?.nextPaydayDate || defaultNextPayday.toISOString().split('T')[0]
  );

  // Screen 2: Universal Nationwide Bills Preset with Editable Due Days
  const [bills, setBills] = useState(() => {
    if (initialDraft?.bills && Array.isArray(initialDraft.bills)) {
      return defaultBillsList.map(def => {
        const match = initialDraft.bills.find(b => b.id === def.id);
        return match ? { ...def, ...match, icon: def.icon } : def;
      });
    }
    return defaultBillsList;
  });

  const [includeEmergencyFund, setIncludeEmergencyFund] = useState(
    initialDraft?.includeEmergencyFund ?? true
  );
  const [emergencyAmount, setEmergencyAmount] = useState(initialDraft?.emergencyAmount || '1000');

  // Auto-save form draft whenever state changes
  useEffect(() => {
    const draftData = {
      name,
      incomeAmount,
      frequency,
      nextPaydayDate,
      bills: bills.map(b => ({ id: b.id, amount: b.amount, due_day: b.due_day, selected: b.selected })),
      includeEmergencyFund,
      emergencyAmount,
      step
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
  }, [name, incomeAmount, frequency, nextPaydayDate, bills, includeEmergencyFund, emergencyAmount, step]);

  if (!isOpen) return null;

  const toggleBill = (id) => {
    setBills(prev => prev.map(b => b.id === id ? { ...b, selected: !b.selected } : b));
  };

  const updateBillAmount = (id, newAmount) => {
    setBills(prev => prev.map(b => b.id === id ? { ...b, amount: parseFloat(newAmount) || 0 } : b));
  };

  const updateBillDueDay = (id, newDay) => {
    const parsed = Math.min(31, Math.max(1, parseInt(newDay) || 1));
    setBills(prev => prev.map(b => b.id === id ? { ...b, due_day: parsed } : b));
  };

  // Calculations
  const parsedIncome = parseFloat(incomeAmount) || 0;
  const selectedBills = bills.filter(b => b.selected);
  const totalBills = selectedBills.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
  const emergencyFund = includeEmergencyFund ? (parseFloat(emergencyAmount) || 0) : 0;
  const spendableRemaining = Math.max(0, parsedIncome - totalBills - emergencyFund);

  // Days calculation
  const targetDate = new Date(nextPaydayDate);
  const currDate = new Date();
  targetDate.setHours(0, 0, 0, 0);
  currDate.setHours(0, 0, 0, 0);
  const diffDays = Math.max(1, Math.ceil((targetDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)));
  const estimatedDaily = (spendableRemaining / diffDays).toFixed(2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.completeFastTrackOnboarding({
        name: name.trim() || 'Ka-Budget',
        income_amount: parsedIncome,
        frequency,
        next_payday_date: nextPaydayDate,
        bills: selectedBills.map(b => ({
          name: t(b.labelKey) || b.defaultName,
          category: b.category,
          amount: b.amount,
          due_day: b.due_day
        })),
        emergency_fund_contribution: emergencyFund
      });

      // Clear draft on successful completion
      localStorage.removeItem(DRAFT_KEY);
      localStorage.setItem('budgetph_onboarded', 'true');

      await loadDashboard();
      onClose();
    } catch (err) {
      alert('Error during setup: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-8 relative overflow-hidden my-8">
        
        {/* Top Gradient Ribbon */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500"></div>

        {/* Header & Prominent Language Chooser */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-green-600/10 dark:bg-green-500/20 text-green-600 dark:text-green-400 flex items-center justify-center font-black text-xl">
              🇵🇭
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
                {t('onboarding_title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {step === 1 ? t('onboarding_subtitle_step1') : t('onboarding_subtitle_step2')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Selector Pill */}
            <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs font-bold shadow-inner">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  language === 'en'
                    ? 'bg-white dark:bg-slate-700 text-green-700 dark:text-green-300 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span>🇺🇸</span>
                <span className="text-[10px]">EN</span>
              </button>
              <button
                type="button"
                onClick={() => setLanguage('tl')}
                className={`px-2 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  language === 'tl'
                    ? 'bg-white dark:bg-slate-700 text-green-700 dark:text-green-300 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span>🇵🇭</span>
                <span className="text-[10px]">TL</span>
              </button>
            </div>

            <div className="hidden sm:flex gap-1.5">
              <div className={`w-5 h-2 rounded-full transition-all ${step === 1 ? 'bg-green-600' : 'bg-green-200 dark:bg-slate-700'}`}></div>
              <div className={`w-5 h-2 rounded-full transition-all ${step === 2 ? 'bg-green-600' : 'bg-green-200 dark:bg-slate-700'}`}></div>
            </div>
          </div>
        </div>

        {step === 1 ? (
          /* ================= STEP 1: INCOME & SCHEDULE ================= */
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                {t('name_label')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('name_placeholder')}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 font-semibold text-slate-900 dark:text-slate-50 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-0.5">
                {t('salary_label')}
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 font-medium">
                {t('salary_subtext')}
              </p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">₱</span>
                <input
                  type="number"
                  required
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 font-black text-slate-900 dark:text-slate-50 text-xl focus:ring-2 focus:ring-green-500 focus:outline-none"
                  placeholder="20,000"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                {t('schedule_label')}
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'semi-monthly', label: t('schedule_semi_monthly'), desc: t('schedule_semi_monthly_desc') },
                  { id: 'monthly', label: t('schedule_monthly'), desc: t('schedule_monthly_desc') },
                  { id: 'weekly', label: t('schedule_weekly'), desc: t('schedule_weekly_desc') },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFrequency(item.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      frequency === item.id
                        ? 'border-green-500 bg-green-50/80 dark:bg-green-950/40 text-green-900 dark:text-green-300 ring-2 ring-green-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <p className="font-bold text-xs">{item.label}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                {t('next_payday_label')}
              </label>
              <input
                type="date"
                required
                value={nextPaydayDate}
                onChange={(e) => setNextPaydayDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 font-semibold text-slate-900 dark:text-slate-50 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                if (!incomeAmount || parseFloat(incomeAmount) <= 0) {
                  alert(language === 'tl' ? 'Pakilagay ang iyong sahod para makalkula ang budget.' : 'Please enter your salary to calculate your budget.');
                  return;
                }
                setStep(2);
              }}
              className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-green-600/20 flex items-center justify-center gap-2 transition cursor-pointer mt-4"
            >
              <span>{t('next_step_btn')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* ================= STEP 2: QUICK BILLS & EDITABLE DUE DATES ================= */
          <form onSubmit={handleSubmit} className="space-y-4 animate-in slide-in-from-right-4 duration-200">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2.5">
                {t('step2_instructions')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto p-1">
                {bills.map((b) => {
                  const Icon = b.icon;
                  const billTitle = t(b.labelKey) || b.defaultName;

                  return (
                    <div
                      key={b.id}
                      onClick={() => toggleBill(b.id)}
                      className={`p-3 rounded-2xl border flex flex-col justify-between gap-2 transition cursor-pointer ${
                        b.selected
                          ? 'border-green-500 bg-green-50/70 dark:bg-green-950/40 text-green-900 dark:text-green-200 ring-1 ring-green-500/30'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 opacity-60 hover:opacity-80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            b.selected ? 'bg-green-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <p className="font-bold text-xs leading-tight text-slate-900 dark:text-slate-100 truncate">{billTitle}</p>
                        </div>
                        
                        {/* Toggle indicator checkbox */}
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center flex-shrink-0 transition ${
                          b.selected ? 'bg-green-600 border-green-600 text-white' : 'border-slate-300 dark:border-slate-700'
                        }`}>
                          {b.selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>

                      {/* Interactive Due Day & Amount inputs when selected */}
                      {b.selected ? (
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-green-200/60 dark:border-green-900/60" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">{t('due_day_label')}</span>
                            <div className="flex items-center bg-white dark:bg-slate-900 border border-green-300 dark:border-green-800 rounded-lg px-1.5 py-0.5">
                              <span className="text-[10px] text-slate-400 font-medium">Day</span>
                              <input
                                type="number"
                                min="1"
                                max="31"
                                value={b.due_day}
                                onChange={(e) => updateBillDueDay(b.id, e.target.value)}
                                className="w-8 text-center text-xs font-black text-slate-900 dark:text-slate-50 bg-transparent focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex items-center bg-white dark:bg-slate-900 border border-green-300 dark:border-green-800 rounded-lg px-2 py-0.5">
                            <span className="text-xs text-slate-400 font-bold mr-1">₱</span>
                            <input
                              type="number"
                              value={b.amount}
                              onChange={(e) => updateBillAmount(b.id, e.target.value)}
                              className="w-16 text-xs font-black text-right text-slate-900 dark:text-slate-50 bg-transparent focus:outline-none"
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic pt-0.5">
                          {t('tap_to_add')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Emergency Fund Checkbox */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeEmergencyFund}
                  onChange={(e) => setIncludeEmergencyFund(e.target.checked)}
                  className="rounded text-green-600 focus:ring-green-500 w-4 h-4"
                />
                <span>{t('emergency_checkbox')}</span>
              </label>
              {includeEmergencyFund && (
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-400">₱</span>
                  <input
                    type="number"
                    value={emergencyAmount}
                    onChange={(e) => setEmergencyAmount(e.target.value)}
                    className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-right"
                  />
                </div>
              )}
            </div>

            {/* Instant Calculation Preview */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 dark:from-emerald-950 dark:to-slate-900 text-white rounded-2xl p-4 shadow-md">
              <div className="flex justify-between items-center text-xs opacity-90 pb-2 border-b border-white/10">
                <span>{t('spendable_balance')}</span>
                <span className="font-bold">₱{spendableRemaining.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <div>
                  <span className="text-[11px] uppercase tracking-wider opacity-80 block">{t('spendable_today')}</span>
                  <span className="text-2xl font-black font-['Plus_Jakarta_Sans']">
                    ₱{Number(estimatedDaily).toLocaleString('en-PH', { minimumFractionDigits: 2 })} {t('per_day')}
                  </span>
                </div>
                <div className="text-right text-[11px] opacity-80">
                  <span>{diffDays} {t('days_until')}</span>
                  <p className="font-bold">{nextPaydayDate}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-2xl transition cursor-pointer"
              >
                {t('back_btn')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-green-600/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>{t('calculating')}</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{t('launch_btn')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
