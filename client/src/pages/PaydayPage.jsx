import React, { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Sparkles, ArrowRight, ShieldCheck, Wallet } from 'lucide-react';
import * as api from '../services/api';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useLanguageStore } from '../stores/useLanguageStore';

export function PaydayPage({ setActiveTab }) {
  const { loadDashboard } = useBudgetStore();
  const { language, t } = useLanguageStore();
  const isTL = language === 'tl';

  const [setupData, setSetupData] = useState(null);
  const [incomeAmount, setIncomeAmount] = useState('30000');
  const [paydayDate, setPaydayDate] = useState(new Date().toISOString().split('T')[0]);
  const [nextPaydayDate, setNextPaydayDate] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    setNextPaydayDate(d.toISOString().split('T')[0]);

    api.fetchPaydaySetup().then((res) => {
      if (res.success) {
        setSetupData(res);
        if (res.incomes?.length) {
          setIncomeAmount(res.incomes[0].amount.toString());
        }
      }
    });
  }, []);

  const obligations = setupData?.obligations || [];
  const allowances = setupData?.allowances || [];

  const totalObligations = obligations.reduce((sum, o) => sum + parseFloat(o.amount || 0), 0);
  const totalAllowances = allowances.reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);
  const emergencyFund = 2000;
  const parsedIncome = parseFloat(incomeAmount) || 0;
  const spendableWants = Math.max(0, parsedIncome - totalObligations - totalAllowances - emergencyFund);

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      const allocations = [
        ...obligations.map(o => ({ category: 'obligation', target_id: o.id, amount: parseFloat(o.amount) })),
        ...allowances.map(a => ({ category: 'allowance', target_id: a.id, amount: parseFloat(a.amount) })),
        { category: 'savings', amount: emergencyFund, notes: 'Emergency Fund' },
        { category: 'wants', amount: spendableWants, notes: 'Pang-Araw-Araw / Wants' }
      ];

      await api.simulatePayday({
        expected_amount: parsedIncome,
        payday_date: paydayDate,
        next_payday_date: nextPaydayDate,
        allocations
      });

      await loadDashboard();
      alert(isTL ? 'Matagumpay na na-activate ang Payday Cycle! 🎉' : 'Payday Simulation activated successfully! 🎉');
      setActiveTab('dashboard');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans'] flex items-center gap-2.5">
          <span>{isTL ? 'Payday Simulator 2.0' : 'Payday Simulator 2.0'}</span>
          <span>📅</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
          {isTL 
            ? 'I-plano ang awtomatikong paghahati-hati ng sahod bago pa man ito pumasok sa ATM.'
            : 'Pre-allocate and simulate your take-home pay before payday arrives.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Form: Income & Dates */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
            {isTL ? 'Sahod at Petsa ng Cut-off' : 'Salary & Cycle Dates'}
          </h3>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
              {isTL ? 'Halaga ng Sahod (₱)' : 'Net Pay Amount (₱)'}
            </label>
            <input
              type="number"
              value={incomeAmount}
              onChange={(e) => setIncomeAmount(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-extrabold font-['Plus_Jakarta_Sans'] text-slate-900 dark:text-slate-50 text-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                {isTL ? 'Petsa ng Sahod' : 'Payday Date'}
              </label>
              <input
                type="date"
                value={paydayDate}
                onChange={(e) => setPaydayDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                {isTL ? 'Susunod na Sahod' : 'Next Payday'}
              </label>
              <input
                type="date"
                value={nextPaydayDate}
                onChange={(e) => setNextPaydayDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleSimulate}
              disabled={isSimulating}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSimulating 
                  ? (isTL ? 'Ina-activate...' : 'Activating...') 
                  : (isTL ? 'I-Activate ang Payday Cycle' : 'Activate Payday Cycle')}
              </span>
            </button>
          </div>
        </div>

        {/* Right Cards: Allocation Breakdown */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
              {isTL ? 'Awtomatikong Paghahati ng Pondo' : 'Automatic Allocation Breakdown'}
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              {isTL ? 'Awtomatikong nakalaan bago gumastos' : 'Pre-budgeted before spending'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* 1. Fixed Obligations */}
            <div className="p-4 rounded-2xl border border-blue-100 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 space-y-1">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                {isTL ? '1. Fixed Obligations (Bills)' : '1. Fixed Obligations (Bills)'}
              </span>
              <p className="text-2xl font-black font-['Plus_Jakarta_Sans'] text-slate-900 dark:text-slate-50">
                ₱{totalObligations.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isTL ? `${obligations.length} bayarin ang awtomatikong nakareserba` : `${obligations.length} bills automatically reserved`}
              </p>
            </div>

            {/* 2. Family Allowances */}
            <div className="p-4 rounded-2xl border border-purple-100 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/30 space-y-1">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                {isTL ? '2. Family Allowances (Baon)' : '2. Family Allowances (Baon)'}
              </span>
              <p className="text-2xl font-black font-['Plus_Jakarta_Sans'] text-slate-900 dark:text-slate-50">
                ₱{totalAllowances.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isTL ? `${allowances.length} miyembro ang nakatalaga` : `${allowances.length} family members assigned`}
              </p>
            </div>

            {/* 3. Emergency Savings */}
            <div className="p-4 rounded-2xl border border-amber-100 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 space-y-1">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                {isTL ? '3. Emergency Savings (Ipon)' : '3. Emergency Savings (Buffer)'}
              </span>
              <p className="text-2xl font-black font-['Plus_Jakarta_Sans'] text-slate-900 dark:text-slate-50">
                ₱{emergencyFund.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isTL ? 'Awtomatikong pondo para sa ipon' : 'Automated savings seed for this cut-off'}
              </p>
            </div>

            {/* 4. Safe Spendable */}
            <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 space-y-1">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                {isTL ? '4. Ligtas na Spendable (Araw-araw)' : '4. Safe Spendable (Daily Limit)'}
              </span>
              <p className="text-2xl font-black font-['Plus_Jakarta_Sans'] text-emerald-700 dark:text-emerald-300">
                ₱{spendableWants.toLocaleString()}
              </p>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                {isTL ? 'Natitirang pwedeng gastusin hanggang sa susunod na sahod' : 'Remaining safe-to-spend allowance until next payday'}
              </p>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
