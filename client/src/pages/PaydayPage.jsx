import React, { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle } from 'lucide-react';
import * as api from '../services/api';
import { useBudgetStore } from '../stores/useBudgetStore';

export function PaydayPage({ setActiveTab }) {
  const { loadDashboard } = useBudgetStore();
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
      alert('Payday Simulation activated successfully! 🎉');
      setActiveTab('dashboard');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
          Payday Simulator 2.0 📅
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
          I-plano ang paghahati-hati ng sahod bago pa man ito dumating.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">Sahod & Petsa</h3>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Halaga ng Sahod (₱)</label>
            <input
              type="number"
              value={incomeAmount}
              onChange={(e) => setIncomeAmount(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-50 text-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Petsa ng Sahod</label>
              <input
                type="date"
                value={paydayDate}
                onChange={(e) => setPaydayDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-xs focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Susunod na Sahod</label>
              <input
                type="date"
                value={nextPaydayDate}
                onChange={(e) => setNextPaydayDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-xs focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleSimulate}
              disabled={isSimulating}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSimulating ? 'Activating...' : 'I-Activate ang Payday Cycle'}</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
            Automatic Allocation Breakdown
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase">1. Fixed Obligations</span>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-50 mt-1">₱{totalObligations.toLocaleString()}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{obligations.length} bills automatically reserved</p>
            </div>

            <div className="p-4 rounded-xl border border-purple-100 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/30">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase">2. Family Allowances</span>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-50 mt-1">₱{totalAllowances.toLocaleString()}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{allowances.length} members assigned</p>
            </div>

            <div className="p-4 rounded-xl border border-amber-100 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase">3. Emergency Savings</span>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-50 mt-1">₱{emergencyFund.toLocaleString()}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Automated savings seed</p>
            </div>

            <div className="p-4 rounded-xl border border-green-200 dark:border-green-800/80 bg-green-50 dark:bg-green-950/40">
              <span className="text-xs font-bold text-green-800 dark:text-green-300 uppercase">4. Spendable / Pang-Araw-Araw</span>
              <p className="text-2xl font-black text-green-700 dark:text-green-400 mt-1">₱{spendableWants.toLocaleString()}</p>
              <p className="text-xs text-green-900 dark:text-green-300 mt-0.5">Remaining safe-to-spend allowance</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
