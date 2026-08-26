import React, { useEffect, useState } from 'react';
import { Receipt, Plus } from 'lucide-react';
import * as api from '../services/api';
import { useBudgetStore } from '../stores/useBudgetStore';

export function ObligationsPage() {
  const { loadDashboard } = useBudgetStore();
  const [obligations, setObligations] = useState([]);
  const [filter, setFilter] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('15');
  const [category, setCategory] = useState('electricity');
  const [isVariable, setIsVariable] = useState(false);

  const loadData = async () => {
    const res = await api.fetchObligations();
    if (res.success) setObligations(res.obligations || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    await api.saveObligation({
      name,
      amount: parseFloat(amount),
      due_day: parseInt(dueDay),
      category,
      is_variable: isVariable
    });
    setName('');
    setAmount('');
    setIsAddOpen(false);
    await loadData();
    await loadDashboard();
  };

  const handleMarkPaid = async (obId) => {
    await api.markObligationPaid({ obligation_id: obId });
    await loadData();
    await loadDashboard();
  };

  const handleUnmarkPaid = async (obId) => {
    await api.unmarkObligationPaid(obId);
    await loadData();
    await loadDashboard();
  };

  const filtered = obligations.filter(o => {
    if (filter === 'paid') return o.is_paid;
    if (filter === 'pending') return !o.is_paid;
    if (filter === 'variable') return o.is_variable;
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
            Obligations & Monthly Bills 📋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Pamahalaan ang mga fixed at variable na bayarin (Meralco, Maynilad, Rent, Internet).
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Obligation</span>
        </button>
      </div>

      <div className="flex gap-2">
        {['all', 'pending', 'paid', 'variable'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
              filter === tab 
                ? 'bg-green-600 text-white shadow-sm' 
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {tab} Bills
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(ob => (
          <div key={ob.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{ob.name}</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{ob.category}</p>
                </div>
                {ob.is_paid ? (
                  <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold border border-blue-200 dark:border-blue-800">✅ Paid</span>
                ) : (
                  <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 rounded-full text-xs font-bold border border-amber-200 dark:border-amber-800">Due Day {ob.due_day}</span>
                )}
              </div>

              <div className="my-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-slate-50">₱{Number(ob.amount).toLocaleString()}</span>
                  {ob.is_variable && (
                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-[10px] font-bold rounded-full border border-purple-200 dark:border-purple-800">Variable Est.</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Due every {ob.due_day}th of the month</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              {ob.is_paid ? (
                <button onClick={() => handleUnmarkPaid(ob.id)} className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">
                  Undo Payment
                </button>
              ) : (
                <button
                  onClick={() => handleMarkPaid(ob.id)}
                  className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                >
                  Mark as Paid
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4 font-['Plus_Jakarta_Sans']">Add New Obligation</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Converge Fiber"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Amount (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Due Day (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVariable}
                    onChange={(e) => setIsVariable(e.target.checked)}
                    className="w-4 h-4 text-green-600 rounded"
                  />
                  <span>Variable bill? (e.g. Meralco, Water)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-sm"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
