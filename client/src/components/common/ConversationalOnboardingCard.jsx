import React, { useState } from 'react';
import { 
  Sparkles, Calendar, DollarSign, Zap, Home, Wifi, Droplets, CreditCard, 
  Smartphone, Check, ArrowRight, ArrowLeft, ShieldCheck, Plus, CheckCircle2, User, Clock, Trash2
} from 'lucide-react';
import * as api from '../../services/api';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { useFeedbackStore } from '../../stores/useFeedbackStore';

const DEFAULT_BILLS = [
  { id: 'electricity', labelEn: 'Electricity Bill', labelTl: 'Kuryente (Electricity)', category: 'electricity', amount: '', due_day: 18, selected: false, icon: '⚡' },
  { id: 'water', labelEn: 'Water Bill', labelTl: 'Tubig (Water Bill)', category: 'water', amount: '', due_day: 22, selected: false, icon: '💧' },
  { id: 'internet', labelEn: 'Internet / Wifi', labelTl: 'Internet / Wifi', category: 'internet', amount: '', due_day: 25, selected: false, icon: '🌐' },
  { id: 'rent', labelEn: 'House Rent', labelTl: 'Upa sa Bahay (Rent)', category: 'rent', amount: '', due_day: 1, selected: false, icon: '🏠' },
  { id: 'loan', labelEn: 'Loans & Cards / Utang', labelTl: 'Loans / Cards / Utang', category: 'credit_card', amount: '', due_day: 5, selected: false, icon: '💳' },
  { id: 'phone', labelEn: 'Mobile Load / Phone', labelTl: 'Load / Phone', category: 'phone', amount: '', due_day: 15, selected: false, icon: '📱' }
];

const PRESET_SALARIES = [10000, 15000, 20000, 25000, 30000, 40000];

export function ConversationalOnboardingCard({ onComplete, setActiveTab }) {
  const { language, t } = useLanguageStore();
  const { loadDashboard } = useBudgetStore();
  const { showErrorModal } = useFeedbackStore();
  const isTL = language === 'tl';

  const [step, setStep] = useState(1); // 1: Name, 2: Salary, 3: Schedule, 4: Bills
  const [name, setName] = useState('');
  const [salaryAmount, setSalaryAmount] = useState(20000);
  const [customSalary, setCustomSalary] = useState('');
  const [frequency, setFrequency] = useState('semi-monthly'); // 'semi-monthly', 'monthly', 'weekly', 'custom'
  const [customPaydayDate, setCustomPaydayDate] = useState('');
  const [bills, setBills] = useState(DEFAULT_BILLS);
  const [newBillName, setNewBillName] = useState('');
  const [newBillAmount, setNewBillAmount] = useState('');
  const [isAddingBill, setIsAddingBill] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeSalary = customSalary ? parseFloat(customSalary) || 0 : salaryAmount;
  const selectedBills = bills.filter(b => b.selected);
  const totalBills = selectedBills.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);

  // Compute Next Payday Date
  const getComputedNextPayday = () => {
    if (frequency === 'custom' && customPaydayDate) {
      return customPaydayDate;
    }
    const d = new Date();
    if (frequency === 'semi-monthly') {
      if (d.getDate() < 15) {
        d.setDate(15);
      } else {
        d.setMonth(d.getMonth() + 1, 0);
      }
    } else if (frequency === 'monthly') {
      d.setMonth(d.getMonth() + 1, 0);
    } else {
      const day = d.getDay();
      const diff = d.getDate() + (5 - day + 7) % 7;
      d.setDate(diff);
    }
    return d.toISOString().split('T')[0];
  };

  const cycleDays = frequency === 'weekly' ? 7 : frequency === 'monthly' ? 30 : 15;
  const estimatedSpendable = Math.max(0, activeSalary - (totalBills / (frequency === 'monthly' ? 1 : 2)));
  const estimatedDaily = Math.round(estimatedSpendable / cycleDays);

  const toggleBill = (id) => {
    setBills(prev => prev.map(b => b.id === id ? { ...b, selected: !b.selected } : b));
  };

  const updateBillAmount = (id, val) => {
    setBills(prev => prev.map(b => b.id === id ? { ...b, amount: parseFloat(val) || 0 } : b));
  };

  const handleAddCustomBill = (e) => {
    e.preventDefault();
    if (!newBillName.trim() || !newBillAmount) return;
    const newBill = {
      id: `custom_${Date.now()}`,
      labelEn: newBillName.trim(),
      labelTl: newBillName.trim(),
      category: 'other',
      amount: parseFloat(newBillAmount) || 0,
      due_day: 15,
      selected: true,
      icon: '📝',
      isCustom: true
    };
    setBills(prev => [...prev, newBill]);
    setNewBillName('');
    setNewBillAmount('');
    setIsAddingBill(false);
  };

  const removeCustomBill = (id) => {
    setBills(prev => prev.filter(b => b.id !== id));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const nextPayday = getComputedNextPayday();

      const payload = {
        name: name.trim(),
        incomeAmount: activeSalary,
        frequency: frequency === 'custom' ? 'semi-monthly' : frequency,
        nextPaydayDate: nextPayday,
        bills: selectedBills.map(b => ({
          name: isTL ? b.labelTl : b.labelEn,
          amount: b.amount,
          due_day: b.due_day || 15,
          category: b.category
        })),
        includeEmergencyFund: true,
        emergencyAmount: 1000
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
      showErrorModal({
        title: isTL ? 'Hindi Nakumpleto ang Pag-kalkula ng Badyet' : 'Budget Setup Could Not Complete',
        message: isTL
          ? 'May naganap na error sa pag-save ng iyong setup sa database. Nakatago pa rin ang lahat ng iyong inilagay na impormasyon para hindi ka na mag-type muli.'
          : 'An issue occurred while saving your financial profile to the cloud database. Your entered details have been preserved so you do not need to retype anything.',
        errorDetails: err.message,
        onRetry: () => handleSubmit()
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="my-3 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/40 shadow-xl max-w-xl w-full mx-auto animate-in zoom-in-95 duration-200 text-slate-900 dark:text-slate-100">
      
      {/* Step Progress Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-sm flex-shrink-0">
            {step === 1 ? '👤' : step === 2 ? '💰' : step === 3 ? '🗓️' : '⚡'}
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
              {step === 1 && (isTL ? '1. Pangalan (Name)' : '1. Your Name')}
              {step === 2 && (isTL ? '2. Sahod kada Cut-off' : '2. Income per Cut-off')}
              {step === 3 && (isTL ? '3. Schedule ng Sahod' : '3. Payday Schedule')}
              {step === 4 && (isTL ? '4. Monthly Bills & Bayarin' : '4. Monthly Bills & Obligations')}
            </h4>
            <p className="text-[10px] text-slate-400">
              {isTL ? `Hakbang ${step} ng 4` : `Step ${step} of 4`}
            </p>
          </div>
        </div>

        {/* Step Indicator dots */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map(s => (
            <button
              key={s}
              type="button"
              onClick={() => s < step && setStep(s)}
              className={`w-2 h-2 rounded-full transition-all ${
                s === step 
                  ? 'w-6 bg-emerald-600' 
                  : s < step 
                    ? 'bg-emerald-400 cursor-pointer' 
                    : 'bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* STEP 1: Name */}
      {step === 1 && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            {isTL ? 'Ano ang iyong pangalan o palayaw?' : 'What is your name or preferred nickname?'}
          </p>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && setStep(2)}
            placeholder={isTL ? 'I-type ang iyong pangalan (e.g. Jerald)' : 'e.g. Jerald, Maria'}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800"
          />
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => setStep(2)}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{isTL ? 'Sunod: Ilagay ang Sahod' : 'Next: Salary Amount'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* STEP 2: Salary Amount */}
      {step === 2 && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            {isTL ? `Magkano ang karaniwang sahod mo kada cut-off, ${name}?` : `How much is your typical salary per cut-off, ${name}?`}
          </p>
          
          <div className="grid grid-cols-3 gap-1.5">
            {PRESET_SALARIES.map(amt => {
              const isSelected = !customSalary && salaryAmount === amt;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setCustomSalary('');
                    setSalaryAmount(amt);
                  }}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition text-center cursor-pointer ${
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
            <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">₱</span>
            <input
              type="number"
              value={customSalary}
              onChange={(e) => setCustomSalary(e.target.value)}
              placeholder={isTL ? 'O i-type ang eksaktong halaga' : 'Or type exact custom amount'}
              className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={activeSalary <= 0}
              onClick={() => setStep(3)}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{isTL ? 'Sunod: Payday Schedule' : 'Next: Payday Schedule'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Payday Schedule with Custom Option */}
      {step === 3 && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            {isTL ? 'Kailan ka sumasahod?' : 'When do you receive your salary?'}
          </p>

          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'semi-monthly', labelEn: '15th & 30th (Kinsenas)', labelTl: '15th & 30th (Kinsenas)' },
              { id: 'monthly', labelEn: 'Monthly (Katapusan)', labelTl: 'Katapusan (Monthly)' },
              { id: 'weekly', labelEn: 'Weekly (Lingguhan)', labelTl: 'Lingguhan (Weekly)' },
              { id: 'custom', labelEn: 'Specific Date (Custom)', labelTl: 'Tukoy na Petsa (Custom)' }
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFrequency(item.id)}
                className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                  frequency === item.id
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500 font-black'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-semibold'
                }`}
              >
                {isTL ? item.labelTl : item.labelEn}
              </button>
            ))}
          </div>

          {frequency === 'custom' && (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                {isTL ? 'Piliin ang susunod na petsa ng sahod:' : 'Select exact next payday date:'}
              </label>
              <input
                type="date"
                value={customPaydayDate}
                onChange={(e) => setCustomPaydayDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
              />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{isTL ? 'Sunod: Monthly Bills' : 'Next: Monthly Bills'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Monthly Bills & Custom Bills */}
      {step === 4 && (
        <form onSubmit={handleSubmit} className="space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {isTL ? 'Piliin o i-edit ang iyong mga regular na bills:' : 'Select or edit your recurring bills:'}
            </p>
            <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
              Total: ₱{totalBills.toLocaleString()}
            </span>
          </div>

          {/* Compact Chips Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {bills.map(b => (
              <div
                key={b.id}
                onClick={() => toggleBill(b.id)}
                className={`p-2 rounded-xl border text-xs transition flex items-center justify-between cursor-pointer ${
                  b.selected
                    ? 'border-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-950/30 text-slate-900 dark:text-slate-100 font-bold'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 text-slate-400 opacity-60'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span>{b.icon}</span>
                  <span className="truncate text-xs">{isTL ? b.labelTl : b.labelEn}</span>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[10px] text-slate-400">₱</span>
                  <input
                    type="number"
                    value={b.amount}
                    onChange={(e) => updateBillAmount(b.id, e.target.value)}
                    className="w-14 px-1 py-0.5 text-xs font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-right focus:ring-1 focus:ring-emerald-500"
                  />
                  {b.isCustom && (
                    <button
                      type="button"
                      onClick={() => removeCustomBill(b.id)}
                      className="text-red-400 hover:text-red-600 p-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Custom Bill Toggle Form */}
          {isAddingBill ? (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-wrap gap-2 items-center text-xs">
              <input
                type="text"
                value={newBillName}
                onChange={(e) => setNewBillName(e.target.value)}
                placeholder={isTL ? 'Pangalan ng Bill (e.g. Gym, Insurance)' : 'Bill Name (e.g. Gym, Insurance)'}
                className="flex-1 min-w-[120px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
              />
              <input
                type="number"
                value={newBillAmount}
                onChange={(e) => setNewBillAmount(e.target.value)}
                placeholder="₱ Amount"
                className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
              />
              <button
                type="button"
                onClick={handleAddCustomBill}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold cursor-pointer"
              >
                {isTL ? 'Idagdag' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => setIsAddingBill(false)}
                className="px-2 py-1.5 text-slate-400 font-medium cursor-pointer"
              >
                {isTL ? 'Kanselahin' : 'Cancel'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingBill(true)}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer py-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isTL ? '+ Magdagdag ng Ibang Bill / Utang' : '+ Add Custom Bill / Debt'}</span>
            </button>
          )}

          {/* Live Daily Spending Result Pill */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">
                {isTL ? 'Safe Daily Budget:' : 'Safe Daily Budget:'}
              </p>
              <p className="text-base font-black text-emerald-600 dark:text-emerald-400 font-['Plus_Jakarta_Sans']">
                ₱{estimatedDaily.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">/ {isTL ? 'araw' : 'day'}</span>
              </p>
            </div>
            <div className="text-right text-[11px] text-slate-500">
              <p>{isTL ? 'Sahod:' : 'Income:'} <span className="font-bold">₱{activeSalary.toLocaleString()}</span></p>
              <p>{isTL ? 'Total Bills:' : 'Total Bills:'} <span className="font-bold">₱{totalBills.toLocaleString()}</span></p>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="animate-pulse">{isTL ? 'Kinakalkula ang Badyet... Sandali lang po' : 'Calculating Budget... Please wait'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isTL ? 'I-kalkula ang Budget at Simulan 🚀' : 'Calculate My Budget & Start 🚀'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}
