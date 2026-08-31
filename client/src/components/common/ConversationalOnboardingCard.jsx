import React, { useState } from 'react';
import { 
  Sparkles, Calendar, DollarSign, Zap, Home, Wifi, Droplets, CreditCard, 
  Smartphone, Check, ArrowRight, ShieldCheck, Plus, CheckCircle2, User, Clock
} from 'lucide-react';
import * as api from '../../services/api';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useLanguageStore } from '../../stores/useLanguageStore';

const DEFAULT_BILLS = [
  { id: 'electricity', labelEn: 'Electricity (Meralco)', labelTl: 'Kuryente (Meralco)', category: 'electricity', amount: 2000, due_day: 18, selected: true, icon: Zap },
  { id: 'water', labelEn: 'Water (Maynilad / Manila Water)', labelTl: 'Tubig (Maynilad)', category: 'water', amount: 500, due_day: 22, selected: true, icon: Droplets },
  { id: 'internet', labelEn: 'Internet / Wifi (PLDT / Converge)', labelTl: 'Internet / Wifi', category: 'internet', amount: 1500, due_day: 25, selected: true, icon: Wifi },
  { id: 'rent', labelEn: 'House Rent / Upa', labelTl: 'Upa sa Bahay (Rent)', category: 'rent', amount: 5000, due_day: 1, selected: true, icon: Home },
  { id: 'loan', labelEn: 'Loans & Cards / Utang', labelTl: 'Loans / Credit Card / Utang', category: 'credit_card', amount: 2000, due_day: 5, selected: false, icon: CreditCard },
  { id: 'phone', labelEn: 'Mobile Load & Promo', labelTl: 'Phone & Load', category: 'phone', amount: 500, due_day: 15, selected: false, icon: Smartphone }
];

const PRESET_SALARIES = [10000, 15000, 20000, 25000, 30000, 40000];

export function ConversationalOnboardingCard({ onComplete, setActiveTab }) {
  const { loadDashboard } = useBudgetStore();
  const { language, t } = useLanguageStore();
  const isTL = language === 'tl';

  const [name, setName] = useState('');
  const [salaryAmount, setSalaryAmount] = useState(20000);
  const [customSalary, setCustomSalary] = useState('');
  const [frequency, setFrequency] = useState('semi-monthly'); // 'semi-monthly', 'monthly', 'weekly'
  const [bills, setBills] = useState(DEFAULT_BILLS);
  const [includeEmergencyFund, setIncludeEmergencyFund] = useState(true);
  const [emergencyAmount, setEmergencyAmount] = useState(1000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compute Next Payday Date based on schedule
  const today = new Date();
  const getComputedNextPayday = (freq) => {
    const d = new Date();
    if (freq === 'semi-monthly') {
      if (d.getDate() < 15) {
        d.setDate(15);
      } else {
        d.setMonth(d.getMonth() + 1, 0); // last day of month
      }
    } else if (freq === 'monthly') {
      d.setMonth(d.getMonth() + 1, 0);
    } else {
      // next Friday
      const day = d.getDay();
      const diff = d.getDate() + (5 - day + 7) % 7;
      d.setDate(diff);
    }
    return d.toISOString().split('T')[0];
  };

  const activeSalary = customSalary ? parseFloat(customSalary) || 0 : salaryAmount;
  const selectedBills = bills.filter(b => b.selected);
  const totalBills = selectedBills.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
  const savingsDeduction = includeEmergencyFund ? (parseFloat(emergencyAmount) || 0) : 0;

  // Estimated daily spendable based on typical 15-day semi-monthly cycle
  const cycleDays = frequency === 'weekly' ? 7 : frequency === 'monthly' ? 30 : 15;
  const estimatedSpendable = Math.max(0, activeSalary - (totalBills / (frequency === 'monthly' ? 1 : 2)) - savingsDeduction);
  const estimatedDaily = Math.round(estimatedSpendable / cycleDays);

  const toggleBill = (id) => {
    setBills(prev => prev.map(b => b.id === id ? { ...b, selected: !b.selected } : b));
  };

  const updateBillAmount = (id, val) => {
    setBills(prev => prev.map(b => b.id === id ? { ...b, amount: parseFloat(val) || 0 } : b));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const nextPayday = getComputedNextPayday(frequency);

      const payload = {
        name: name.trim(),
        incomeAmount: activeSalary,
        frequency,
        nextPaydayDate: nextPayday,
        bills: selectedBills.map(b => ({
          name: isTL ? b.labelTl : b.labelEn,
          amount: b.amount,
          due_day: b.due_day,
          category: b.category
        })),
        includeEmergencyFund,
        emergencyAmount: parseFloat(emergencyAmount) || 1000
      };

      const res = await api.completeFastTrackOnboarding(payload);
      if (res.success) {
        await loadDashboard();
        if (onComplete) {
          onComplete({
            name: name.trim(),
            salary: activeSalary,
            dailyBudget: estimatedDaily,
            totalBills,
            nextPayday
          });
        }
      }
    } catch (err) {
      console.error('Onboarding submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="my-4 p-5 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-500/40 shadow-2xl max-w-2xl w-full mx-auto animate-in zoom-in-95 duration-200 text-slate-900 dark:text-slate-100">
      
      {/* Card Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xl shadow-md flex-shrink-0">
          📋
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
            {isTL ? 'Mabilisang Setup ng Badyet' : 'Fast-Track Budget Setup'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isTL 
              ? 'Punan ang mga sumusunod para makalkula agad ng AI ang iyong safe daily budget at payday schedule.' 
              : 'Complete your initial profile so the AI can compute your daily budget limit and payday allocations.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* 1. Name Input */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isTL ? '1. Ano ang iyong pangalan o palayaw?' : '1. What is your name or nickname?'}</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isTL ? 'Halimbawa: Jerald, Maria, Mark' : 'e.g. Jerald, Maria, Mark'}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition"
          />
        </div>

        {/* 2. Salary per Cut-off */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isTL ? '2. Magkano ang karaniwang sahod mo kada cut-off?' : '2. How much is your salary per cut-off?'}</span>
          </label>

          <div className="flex flex-wrap gap-2 mb-2">
            {PRESET_SALARIES.map((amt) => {
              const isSelected = !customSalary && salaryAmount === amt;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setCustomSalary('');
                    setSalaryAmount(amt);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  ₱{amt.toLocaleString()}
                </button>
              );
            })}
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₱</span>
            <input
              type="number"
              step="0.01"
              value={customSalary || (salaryAmount ? String(salaryAmount) : '')}
              onChange={(e) => {
                setCustomSalary(e.target.value);
                setSalaryAmount(parseFloat(e.target.value) || 0);
              }}
              placeholder={isTL ? 'I-type ang eksaktong halaga kung iba' : 'Or type custom salary amount'}
              className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm font-black focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* 3. Pay Schedule */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isTL ? '3. Kailan ka sumasahod?' : '3. What is your payday schedule?'}</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: 'semi-monthly', labelEn: '15th & 30th (Kinsenas)', labelTl: '15th & 30th (Kinsenas)' },
              { id: 'monthly', labelEn: 'Monthly (Katapusan)', labelTl: 'Kada Buwan (Katapusan)' },
              { id: 'weekly', labelEn: 'Weekly (Lingguhan)', labelTl: 'Lingguhan (Weekly)' }
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFrequency(item.id)}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                  frequency === item.id
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500 font-black'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 font-semibold'
                }`}
              >
                <p className="text-xs">{isTL ? item.labelTl : item.labelEn}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Primary Monthly Bills Toggle */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isTL ? '4. Pangunahing Buwanang Bills (Piliin ang meron ka):' : '4. Primary Monthly Obligations:'}</span>
            </label>
            <span className="text-[11px] font-black text-slate-900 dark:text-slate-100 font-['Plus_Jakarta_Sans']">
              Total: ₱{totalBills.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {bills.map(b => {
              const Icon = b.icon;
              return (
                <div
                  key={b.id}
                  onClick={() => toggleBill(b.id)}
                  className={`p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                    b.selected
                      ? 'border-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-950/30 text-slate-900 dark:text-slate-50 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/20 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs flex-shrink-0 ${
                      b.selected ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold truncate">
                      {isTL ? b.labelTl : b.labelEn}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs font-bold text-slate-400">₱</span>
                    <input
                      type="number"
                      value={b.amount}
                      onChange={(e) => updateBillAmount(b.id, e.target.value)}
                      className="w-16 px-1.5 py-0.5 text-xs font-black rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-right focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Live Blueprint Preview Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600/10 to-teal-600/10 border border-emerald-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              {isTL ? 'Kinalkulang Safe Daily Spendable' : 'Estimated Daily Budget Limit'}
            </span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-['Plus_Jakarta_Sans']">
              ₱{estimatedDaily.toLocaleString()} <span className="text-xs font-normal text-slate-500">/ {isTL ? 'araw' : 'day'}</span>
            </p>
          </div>

          <div className="text-right text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
            <p>{isTL ? 'Sahod:' : 'Income:'} <span className="font-bold text-slate-800 dark:text-slate-200">₱{activeSalary.toLocaleString()}</span></p>
            <p>{isTL ? 'Bills per cut-off:' : 'Bills / cut-off:'} <span className="font-bold text-slate-800 dark:text-slate-200">₱{Math.round(totalBills / (frequency === 'monthly' ? 1 : 2)).toLocaleString()}</span></p>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !name.trim() || activeSalary <= 0}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-lg hover:shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{isTL ? 'I-kalkula ang Aking Budget at Simulan 🚀' : 'Calculate My Budget & Start 🚀'}</span>
            </>
          )}
        </button>

      </form>
    </div>
  );
}
