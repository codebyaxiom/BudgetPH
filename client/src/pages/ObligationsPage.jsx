import React, { useEffect, useState } from 'react';
import { Receipt, Plus, CheckCircle2, RotateCcw, Trash2, Calendar, Tag, AlertCircle } from 'lucide-react';
import * as api from '../services/api';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useLanguageStore } from '../stores/useLanguageStore';

const CATEGORY_NAMES = {
  electricity: { en: 'Electricity / Power', tl: 'Kuryente / Power' },
  water: { en: 'Water Bill', tl: 'Tubig / Water' },
  internet: { en: 'Internet / Wifi', tl: 'Internet / Wifi' },
  rent: { en: 'House Rent', tl: 'Upa sa Bahay' },
  loan: { en: 'Loan / Debt', tl: 'Utang / Loan' },
  credit_card: { en: 'Credit Card', tl: 'Credit Card' },
  phone: { en: 'Phone / Load', tl: 'Phone at Load' },
  other: { en: 'Other Obligation', tl: 'Iba pang Bayarin' }
};

export function ObligationsPage() {
  const { loadDashboard } = useBudgetStore();
  const { language, t } = useLanguageStore();
  const isTL = language === 'tl';

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

  const handleMarkPaid = async (id) => {
    await api.markObligationPaid({
      obligation_id: id,
      paid_date: new Date().toISOString().split('T')[0]
    });
    await loadData();
    await loadDashboard();
  };

  const handleUnmarkPaid = async (id) => {
    await api.unmarkObligationPaid(id);
    await loadData();
    await loadDashboard();
  };

  const handleDelete = async (ob) => {
    const confirmMsg = isTL
      ? `Sigurado ka bang nais mong tanggalin ang bayarin na "${ob.name}"?`
      : `Are you sure you want to delete the bill "${ob.name}"?`;

    if (!confirm(confirmMsg)) return;

    await api.deleteObligation(ob.id);
    await loadData();
    await loadDashboard();
  };

  const filtered = obligations.filter(o => {
    if (filter === 'paid') return o.is_paid;
    if (filter === 'pending') return !o.is_paid;
    if (filter === 'variable') return o.is_variable;
    return true;
  });

  const filterTabs = [
    { id: 'all', labelEn: 'All Bills', labelTl: 'Lahat ng Bills' },
    { id: 'pending', labelEn: 'Pending Bills', labelTl: 'Hindi Pa Bayad' },
    { id: 'paid', labelEn: 'Paid Bills', labelTl: 'Bayad Na' },
    { id: 'variable', labelEn: 'Variable Bills', labelTl: 'Pabago-bago' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans'] flex items-center gap-2.5">
            <span>{isTL ? 'Mga Bayarin at Buwanang Bills' : 'Obligations & Monthly Bills'}</span>
            <span>📋</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {isTL 
              ? 'Pamahalaan ang mga fixed at variable na bayarin (Meralco, Maynilad, Upa, Internet, Utang).'
              : 'Track and manage fixed and variable monthly commitments (Utilities, Rent, Loans, Cards).'}
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isTL ? 'Magdagdag ng Bayarin' : 'Add Obligation'}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto select-none no-scrollbar">
        {filterTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              filter === tab.id 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {isTL ? tab.labelTl : tab.labelEn}
          </button>
        ))}
      </div>

      {/* Obligations Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-12 text-center">
          <span className="text-4xl">📋</span>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-3 font-['Plus_Jakarta_Sans']">
            {isTL ? 'Walang nahanap na bayarin' : 'No bills found in this filter'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            {isTL 
              ? 'Lahat ng bayarin sa filter na ito ay na-settle na o wala pang naitala.'
              : 'All obligations in this category are settled or none have been added.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(ob => {
            const catLabel = CATEGORY_NAMES[ob.category]?.[language] || ob.category;

            return (
              <div 
                key={ob.id} 
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-800/80 transition"
              >
                <div>
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug">
                        {ob.name}
                      </h3>
                      <span className="inline-block text-[11px] font-semibold text-slate-400 dark:text-slate-500 capitalize mt-0.5">
                        {catLabel}
                      </span>
                    </div>

                    {ob.is_paid ? (
                      <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isTL ? 'Bayad Na' : 'Paid'}</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 rounded-full text-xs font-bold border border-amber-200 dark:border-amber-800">
                        {isTL ? `Ika-${ob.due_day}` : `Due Day ${ob.due_day}`}
                      </span>
                    )}
                  </div>

                  <div className="my-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black font-['Plus_Jakarta_Sans'] text-slate-900 dark:text-slate-50 tracking-tight">
                        ₱{Number(ob.amount).toLocaleString()}
                      </span>
                      {ob.is_variable && (
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-[10px] font-bold rounded-full border border-purple-200 dark:border-purple-800">
                          {isTL ? 'Pabago-bago' : 'Variable Est.'}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {isTL ? `Due tuwing ika-${ob.due_day} ng buwan` : `Due every ${ob.due_day}th of the month`}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3.5 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {ob.is_paid ? (
                    <button 
                      onClick={() => handleUnmarkPaid(ob.id)} 
                      className="px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isTL ? 'I-undo ang Bayad' : 'Undo Payment'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleMarkPaid(ob.id)}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isTL ? 'I-marka na Bayad' : 'Mark as Paid'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(ob)}
                    className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                    title={isTL ? 'Tanggalin ang bayarin' : 'Delete obligation'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Obligation Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-1 font-['Plus_Jakarta_Sans']">
              {isTL ? 'Magdagdag ng Bagong Bayarin 📋' : 'Add New Obligation 📋'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {isTL ? 'Ilista ang fixed o variable na bayarin para awtomatikong mabawas sa sahod.' : 'Enter bill details to automatically reserve budget on payday.'}
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  {isTL ? 'Pangalan ng Bayarin' : 'Bill / Debt Name'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Meralco, Converge, Rent, Pag-IBIG Loan"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                    {isTL ? 'Halaga (₱)' : 'Amount (₱)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1500.00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 font-black text-base focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                    {isTL ? 'Araw ng Due' : 'Due Day'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  {isTL ? 'Kategorya' : 'Category'}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm font-semibold"
                >
                  <option value="electricity">Electricity (Kuryente)</option>
                  <option value="water">Water (Tubig)</option>
                  <option value="internet">Internet / Wifi</option>
                  <option value="rent">House Rent (Upa)</option>
                  <option value="loan">Loan / Personal Debt (Utang)</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="phone">Phone & Load</option>
                  <option value="other">Other Obligation</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isVar"
                  checked={isVariable}
                  onChange={(e) => setIsVariable(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="isVar" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  {isTL ? 'Pabago-bago ang halaga bawat buwan (Variable bill)' : 'Amount varies every month (Variable bill)'}
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer"
                >
                  {isTL ? 'Kanselahin' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition cursor-pointer"
                >
                  {isTL ? 'I-save ang Bayarin' : 'Save Obligation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
