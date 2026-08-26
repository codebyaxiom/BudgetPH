import React, { useEffect, useState } from 'react';
import { Wallet, Trash2 } from 'lucide-react';
import * as api from '../services/api';
import { useBudgetStore } from '../stores/useBudgetStore';

export function DailyPage() {
  const { loadDashboard } = useBudgetStore();
  const [dailyData, setDailyData] = useState(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [mood, setMood] = useState('need');
  const [familyMemberId, setFamilyMemberId] = useState('');

  const loadData = async () => {
    const res = await api.fetchDailyData();
    if (res.success) setDailyData(res);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!description || !amount) return;

    await api.logExpense({
      description,
      amount: parseFloat(amount),
      category,
      mood,
      family_member_id: familyMemberId ? parseInt(familyMemberId) : null,
      expense_date: new Date().toISOString().split('T')[0]
    });
    setDescription('');
    setAmount('');
    await loadData();
    await loadDashboard();
  };

  const handleDelete = async (id) => {
    if (!confirm('Tanggalin ang expense record na ito?')) return;
    await api.deleteExpense(id);
    await loadData();
    await loadDashboard();
  };

  const m = dailyData?.metrics || {};
  const expenses = dailyData?.todayExpenses || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
          Pang-Araw-Araw na Gastos 💰
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
          I-monitor ang iyong spending limit at i-tag ang bawat binibili.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daily Budget Limit</p>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 mt-1">₱{Number(m.daily_budget || 0).toLocaleString()}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Base spending capacity per day</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nagastos Ngayong Araw</p>
          <p className="text-3xl font-extrabold text-red-600 dark:text-red-400 mt-1">₱{Number(m.spent_today || 0).toLocaleString()}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{expenses.length} transaction(s) today</p>
        </div>

        <div className={`rounded-2xl p-6 border shadow-sm ${
          m.remaining_today < 0 
            ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-300' 
            : 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800 text-green-900 dark:text-green-300'
        }`}>
          <p className="text-xs font-bold uppercase tracking-wider opacity-80">Natitira Pang Pwede Gastusin</p>
          <p className="text-3xl font-extrabold mt-1">₱{Number(m.remaining_today || 0).toLocaleString()}</p>
          <p className="text-xs mt-1 opacity-80">{m.days_until_payday || 0} araw bago ang susunod na sahod</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm h-fit">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 mb-4 font-['Plus_Jakarta_Sans']">
            Mag-log ng Bagong Gastos
          </h3>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Deskripsyon</label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Pamasahe, McDo, Load"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Halaga (₱)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-base font-bold focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Kategorya</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              >
                <option value="food">🍲 Pagkain</option>
                <option value="transport">🚗 Pamasahe / Gas</option>
                <option value="groceries">🛒 Grocery / Palengke</option>
                <option value="utilities">💡 Utilities / Load</option>
                <option value="medical">💊 Gamot / Health</option>
                <option value="entertainment">🎮 Leisure / Luho</option>
                <option value="other">📦 Iba pa</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Mood Tag</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'need', label: '✅ Need' },
                  { id: 'want', label: '🛍️ Want' },
                  { id: 'regret', label: '😬 Regret' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMood(item.id)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                      mood === item.id 
                        ? 'bg-green-600 text-white border-green-600' 
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl shadow-md transition"
            >
              + I-record ang Gastos
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 mb-4 font-['Plus_Jakarta_Sans']">
            Mga Nagastos Ngayong Araw ({new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })})
          </h3>

          <div className="space-y-3">
            {expenses.length > 0 ? (
              expenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{exp.description}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="capitalize">{exp.category}</span>
                      {exp.member_name && <span> · Para kay: <strong>{exp.member_name}</strong></span>}
                      {exp.mood && (
                        <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold ${
                          exp.mood === 'need' ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300' :
                          exp.mood === 'want' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                        }`}>
                          {exp.mood}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-red-600 dark:text-red-400 text-base">
                      -₱{Number(exp.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 text-center text-slate-400 dark:text-slate-500">
                <Wallet className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium">Wala pang gastos ngayong araw.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
