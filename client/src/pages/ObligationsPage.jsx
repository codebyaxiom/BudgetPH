import React, { useEffect, useState } from 'react';
import { 
  Receipt, Plus, CheckCircle2, RotateCcw, Trash2, Calendar, Tag, 
  AlertTriangle, Clock, AlertCircle, Sparkles, ArrowRight, ShieldCheck,
  TrendingDown, DollarSign, CalendarCheck, Edit3, HelpCircle
} from 'lucide-react';
import * as api from '../services/api';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useLanguageStore } from '../stores/useLanguageStore';
import { getBillDueStatus } from '../utils/billStatus';

const CATEGORY_NAMES = {
  electricity: { en: 'Electricity / Power (Meralco)', tl: 'Kuryente / Power (Meralco)' },
  water: { en: 'Water Bill (Maynilad/Manila Water)', tl: 'Tubig / Water' },
  internet: { en: 'Internet / Wifi (PLDT/Converge)', tl: 'Internet / Wifi' },
  rent: { en: 'House Rent', tl: 'Upa sa Bahay' },
  loan: { en: 'Loan / Debt (Utang)', tl: 'Utang / Loan' },
  credit_card: { en: 'Credit Card', tl: 'Credit Card' },
  phone: { en: 'Phone / Load', tl: 'Phone at Load' },
  other: { en: 'Other Obligation', tl: 'Iba pang Bayarin' }
};

const MONTH_NAMES = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  tl: ['Enero', 'Pebrero', 'Marso', 'Abril', 'Mayo', 'Hunyo', 'Hulyo', 'Agosto', 'Setyembre', 'Oktubre', 'Nobyembre', 'Disyembre']
};

export function ObligationsPage() {
  const { loadDashboard } = useBudgetStore();
  const { language, t } = useLanguageStore();
  const isTL = language === 'tl';

  const [obligations, setObligations] = useState([]);
  const [filter, setFilter] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingObligation, setEditingObligation] = useState(null);
  
  // Add/Edit Form State
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('15');
  const [category, setCategory] = useState('electricity');
  const [isVariable, setIsVariable] = useState(true);
  const [isInstallment, setIsInstallment] = useState(false);
  const [endMonth, setEndMonth] = useState(12);
  const [endYear, setEndYear] = useState(new Date().getFullYear());
  const [creditorName, setCreditorName] = useState('');

  // Payment / Advance Modal State
  const [activePaymentModalOb, setActivePaymentModalOb] = useState(null);
  const [advanceMonths, setAdvanceMonths] = useState(1);
  const [customAdvanceAmount, setCustomAdvanceAmount] = useState('');

  const loadData = async () => {
    const res = await api.fetchObligations();
    if (res.success) setObligations(res.obligations || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingObligation(null);
    setName('');
    setAmount('');
    setDueDay('15');
    setCategory('electricity');
    setIsVariable(true);
    setIsInstallment(false);
    setEndMonth(12);
    setEndYear(new Date().getFullYear());
    setCreditorName('');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (ob) => {
    setEditingObligation(ob);
    setName(ob.name || '');
    setAmount(ob.monthly_amount || ob.amount || '');
    setDueDay(String(ob.due_day || 15));
    setCategory(ob.category || 'electricity');
    setIsVariable(Boolean(ob.is_variable));
    setIsInstallment(Boolean(ob.is_installment));
    setEndMonth(ob.end_month || 12);
    setEndYear(ob.end_year || new Date().getFullYear());
    setCreditorName(ob.creditor_name || '');
    setIsAddOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const finalAmt = amount ? parseFloat(amount) : (category === 'electricity' ? 1500 : (category === 'water' ? 450 : 1000));
    
    await api.saveObligation({
      id: editingObligation?.id,
      name,
      amount: finalAmt,
      due_day: parseInt(dueDay),
      category,
      is_variable: isVariable,
      is_installment: isInstallment,
      end_month: isInstallment ? parseInt(endMonth) : null,
      end_year: isInstallment ? parseInt(endYear) : null,
      creditor_name: creditorName || null
    });
    setName('');
    setAmount('');
    setIsInstallment(false);
    setIsVariable(false);
    setCreditorName('');
    setEditingObligation(null);
    setIsAddOpen(false);
    await loadData();
    await loadDashboard();
  };

  const handleOpenPaymentModal = (ob) => {
    if (isInstOb(ob)) {
      setActivePaymentModalOb(ob);
      setAdvanceMonths(1);
      setCustomAdvanceAmount(ob.monthly_amount || ob.amount);
    } else {
      handleMarkPaid(ob.id, 1, ob.amount);
    }
  };

  const handleMarkPaid = async (id, monthsCount = 1, customAmt = null) => {
    const target = obligations.find(o => o.id === id);
    const amtToPay = customAmt !== null ? parseFloat(customAmt) : (target ? parseFloat(target.monthly_amount || target.amount) * monthsCount : null);
    
    await api.markObligationPaid({
      obligation_id: id,
      paid_date: new Date().toISOString().split('T')[0],
      amount_paid: amtToPay,
      months_to_advance: monthsCount,
      is_advance: monthsCount > 1
    });
    setActivePaymentModalOb(null);
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

  // Calculations for filters
  const currentMonthNum = new Date().getMonth() + 1;
  const currentYearNum = new Date().getFullYear();

  const isInstOb = (o) => Boolean(o.is_installment) && (o.end_month !== null && o.end_month !== undefined && o.end_month > 0);

  const overdueBills = obligations.filter(o => !o.is_paid && o.is_active && getBillDueStatus(o.due_day, o.is_paid, language).isOverdue);
  const dueTodayBills = obligations.filter(o => !o.is_paid && o.is_active && getBillDueStatus(o.due_day, o.is_paid, language).isDueToday);
  const installmentDebts = obligations.filter(o => isInstOb(o));
  const variableBills = obligations.filter(o => Boolean(o.is_variable) && o.is_active);
  const completedDebts = obligations.filter(o => o.status === 'completed' || (!o.is_active && isInstOb(o)));
  const totalOverdueAmount = overdueBills.reduce((sum, o) => sum + parseFloat(o.amount || 0), 0);

  const filtered = obligations.filter(o => {
    const dueInfo = getBillDueStatus(o.due_day, o.is_paid, language);
    if (filter === 'overdue') return !o.is_paid && o.is_active && dueInfo.isOverdue;
    if (filter === 'due_soon') return !o.is_paid && o.is_active && dueInfo.isDueSoon;
    if (filter === 'paid') return o.is_paid;
    if (filter === 'pending') return !o.is_paid && o.is_active;
    if (filter === 'installments') return isInstOb(o) && o.is_active;
    if (filter === 'variable') return Boolean(o.is_variable) && o.is_active;
    if (filter === 'completed') return o.status === 'completed' || (!o.is_active && isInstOb(o));
    return o.is_active || filter === 'all';
  });

  const filterTabs = [
    { id: 'all', labelEn: 'All Bills', labelTl: 'Lahat ng Bills', count: obligations.length },
    { id: 'overdue', labelEn: `🚨 Overdue (${overdueBills.length})`, labelTl: `🚨 Lipas na (${overdueBills.length})`, count: overdueBills.length, isUrgent: overdueBills.length > 0 },
    { id: 'due_soon', labelEn: '⏳ Due Soon / Today', labelTl: '⏳ Nearing Due', count: dueTodayBills.length },
    { id: 'installments', labelEn: `⏳ Installments & Utang (${installmentDebts.filter(d=>d.is_active).length})`, labelTl: `⏳ Hulugan at Utang (${installmentDebts.filter(d=>d.is_active).length})` },
    { id: 'variable', labelEn: `📊 Variable Utilities (${variableBills.length})`, labelTl: `📊 Pabago-bago (${variableBills.length})` },
    { id: 'pending', labelEn: 'Pending Bills', labelTl: 'Hindi Pa Bayad' },
    { id: 'paid', labelEn: 'Paid Bills', labelTl: 'Bayad Na' },
    { id: 'completed', labelEn: `🎉 Fully Paid (${completedDebts.length})`, labelTl: `🎉 Bayad na Lahat (${completedDebts.length})` }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans'] flex items-center gap-2.5">
            <span>{isTL ? 'Mga Bayarin, Hulugan at Utang' : 'Obligations, Installments & Debts'}</span>
            <span>📋</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {isTL 
              ? 'Subaybayan ang kuryente, tubig, internet, at fixed-term utang na may smart estimation at advance payments.' 
              : 'Track electricity, water, internet, and fixed-term installment debts with smart predictions and advance payment options.'}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-md transition flex items-center gap-2 cursor-pointer self-start sm:self-auto hover:scale-[1.02] active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{isTL ? 'Magdagdag ng Bayarin / Utang' : 'Add Obligation / Debt'}</span>
        </button>
      </div>

      {/* Overdue Urgent Alert Banner */}
      {overdueBills.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 dark:border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-800 dark:text-rose-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">
                {isTL 
                  ? `🚨 May ${overdueBills.length} bayarin kang lipas na sa due date!` 
                  : `🚨 Attention: You have ${overdueBills.length} overdue bill(s) past due date!`}
              </p>
              <p className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-0.5">
                {isTL 
                  ? `Kabuuang halagang dapat bayaran: ₱${totalOverdueAmount.toLocaleString()}. Bayaran agad para maiwasan ang disconnection o penalty.` 
                  : `Total overdue amount: ₱${totalOverdueAmount.toLocaleString()}. Settle immediately to avoid disconnection fees or penalties.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilter('overdue')}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer self-start sm:self-auto whitespace-nowrap"
          >
            {isTL ? 'Tingnan ang Overdue Bills' : 'View Overdue Bills'}
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 select-none no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filterTabs.map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : tab.isUrgent
                    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/20'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span>{isTL ? tab.labelTl : tab.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* Obligations Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-12 text-center">
          <span className="text-4xl">📋</span>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-3 font-['Plus_Jakarta_Sans']">
            {isTL ? 'Walang nahanap na bayarin sa filter na ito' : 'No bills found in this filter'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            {isTL 
              ? 'Lahat ng bayarin sa kategoryang ito ay na-settle na o wala pang naitala.'
              : 'All obligations in this category are settled or none have been added.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(ob => {
            const catLabel = CATEGORY_NAMES[ob.category]?.[language] || ob.category;
            const dueInfo = getBillDueStatus(ob.due_day, ob.is_paid, language);
            const isInstallment = isInstOb(ob);
            const isCompleted = ob.status === 'completed' || (!ob.is_active && isInstallment);
            
            // Calculate Installment Progress
            const monthlyAmt = parseFloat(ob.monthly_amount || ob.amount);
            const totalAmt = parseFloat(ob.total_amount || (monthlyAmt * 4));
            const remBal = ob.remaining_balance !== null && ob.remaining_balance !== undefined ? parseFloat(ob.remaining_balance) : (isCompleted ? 0 : totalAmt);
            const paidAmt = Math.max(0, totalAmt - remBal);
            const progressPct = totalAmt > 0 ? Math.min(100, Math.round((paidAmt / totalAmt) * 100)) : 100;
            const endMonthName = ob.end_month ? (MONTH_NAMES[language][ob.end_month - 1] || `Month ${ob.end_month}`) : (isTL ? 'Disyembre' : 'December');

            return (
              <div 
                key={ob.id} 
                className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition ${
                  isCompleted
                    ? 'border-emerald-300/60 dark:border-emerald-800/40 bg-emerald-50/20 dark:bg-emerald-950/10'
                    : dueInfo.isOverdue
                      ? 'border-rose-400/80 dark:border-rose-800/80 bg-rose-50/20 dark:bg-rose-950/20 ring-1 ring-rose-400/40'
                      : 'border-slate-200/90 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800/80'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug flex items-center gap-1.5">
                        <span>{ob.name}</span>
                        {isInstallment && (
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-black rounded-lg border border-amber-300 dark:border-amber-700">
                            {isTL ? 'Hulugan / Utang' : 'Installment'}
                          </span>
                        )}
                      </h3>
                      <span className="inline-block text-[11px] font-semibold text-slate-400 dark:text-slate-500 capitalize mt-0.5">
                        {catLabel}
                      </span>
                    </div>

                    {/* Status Badge */}
                    {isCompleted ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-300 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isTL ? '🎉 Bayad Na Lahat!' : '🎉 Fully Settled!'}</span>
                      </span>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${dueInfo.badgeClass}`}>
                        {ob.is_paid ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                        <span>{dueInfo.shortLabel}</span>
                      </span>
                    )}
                  </div>

                  <div className="my-3 space-y-2">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className={`text-2xl font-black font-['Plus_Jakarta_Sans'] tracking-tight ${
                        isCompleted
                          ? 'text-slate-400 dark:text-slate-600 line-through'
                          : dueInfo.isOverdue 
                            ? 'text-rose-600 dark:text-rose-400' 
                            : 'text-slate-900 dark:text-slate-50'
                      }`}>
                        ₱{Number(ob.amount).toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        {isInstallment ? (isTL ? '/ buwan' : '/ month') : ''}
                      </span>
                      {Boolean(ob.is_variable) && (
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-[10px] font-bold rounded-full border border-purple-200 dark:border-purple-800">
                          {isTL ? 'Pabago-bago (Est.)' : 'Variable Est.'}
                        </span>
                      )}
                    </div>

                    {/* Installment Term & Balance Progress Card */}
                    {isInstallment && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 rounded-xl space-y-1.5">
                        <div className="flex justify-between items-center text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          <span>
                            {isTL ? 'Matatapos:' : 'Target End:'} <strong className="text-emerald-600 dark:text-emerald-400">{endMonthName} {ob.end_year || currentYearNum}</strong>
                          </span>
                          <span>
                            ₱{paidAmt.toLocaleString()} / ₱{totalAmt.toLocaleString()} ({progressPct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500">
                          <span>{isTL ? 'Natitirang Utang / Balanse:' : 'Remaining Balance:'} ₱{remBal.toLocaleString()}</span>
                          {ob.paid_months_count > 0 && (
                            <span>{ob.paid_months_count} {isTL ? 'buwan nang nabayaran' : 'months paid'}</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {!isCompleted && (
                      <p className={`text-xs font-medium ${
                        dueInfo.isOverdue 
                          ? 'text-rose-600 dark:text-rose-400 font-bold' 
                          : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {dueInfo.label}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3.5 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {isCompleted ? (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" />
                      <span>{isTL ? 'Tapos na ang bayarin! 🎊' : 'Debt completed! 🎊'}</span>
                    </span>
                  ) : ob.is_paid ? (
                    <button 
                      onClick={() => handleUnmarkPaid(ob.id)} 
                      className="px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isTL ? 'I-undo ang Bayad' : 'Undo Payment'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenPaymentModal(ob)}
                      className={`flex-1 py-2 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 text-white ${
                        dueInfo.isOverdue
                          ? 'bg-rose-600 hover:bg-rose-700 active:scale-98'
                          : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isInstallment ? (isTL ? 'Magbayad / Advance' : 'Record / Advance Pay') : (isTL ? 'I-marka na Bayad' : 'Mark as Paid')}</span>
                    </button>
                  )}

                  <div className="flex items-center gap-1">
                    {/* Edit Button */}
                    <button
                      onClick={() => handleOpenEdit(ob)}
                      className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition cursor-pointer"
                      title={isTL ? 'I-edit ang bayarin' : 'Edit obligation'}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(ob)}
                      className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                      title={isTL ? 'Tanggalin ang bayarin' : 'Delete obligation'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Advance Payment Modal */}
      {activePaymentModalOb && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans'] flex items-center gap-1.5">
                  <span>💰 {isTL ? 'Magbayad o Mag-Advance sa Utang' : 'Pay or Advance Installment Debt'}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {activePaymentModalOb.name} · ₱{Number(activePaymentModalOb.monthly_amount || activePaymentModalOb.amount).toLocaleString()} / {isTL ? 'buwan' : 'month'}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                {isTL ? 'Piliin ang Uri ng Pagbabayad:' : 'Select Payment Option:'}
              </label>

              {/* Option 1: 1 Month */}
              <button
                type="button"
                onClick={() => handleMarkPaid(activePaymentModalOb.id, 1)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/50 text-left transition flex items-center justify-between cursor-pointer group"
              >
                <div>
                  <p className="font-bold text-xs text-slate-900 dark:text-slate-100">
                    {isTL ? 'Regular na 1 Buwan' : 'Regular 1 Month Payment'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {isTL ? 'Bawas sa utang para sa kasalukuyang cut-off.' : 'Standard monthly installment.'}
                  </p>
                </div>
                <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                  ₱{Number(activePaymentModalOb.monthly_amount || activePaymentModalOb.amount).toLocaleString()}
                </span>
              </button>

              {/* Option 2: 2 Months Advance (Reduces 1 month from end date) */}
              <button
                type="button"
                onClick={() => handleMarkPaid(activePaymentModalOb.id, 2)}
                className="w-full p-3 rounded-xl border border-emerald-300/80 dark:border-emerald-700/80 bg-emerald-50/40 dark:bg-emerald-950/40 text-left transition flex items-center justify-between cursor-pointer group"
              >
                <div>
                  <p className="font-bold text-xs text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{isTL ? 'Advance ng 2 Buwan (Mas mabilis matapos!)' : 'Advance 2 Months (Finish faster!)'}</span>
                  </p>
                  <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">
                    {isTL ? 'Awtomatikong mababawasan ng 1 buwan ang target end date.' : 'Automatically deducts 1 month earlier from end date.'}
                  </p>
                </div>
                <span className="font-black text-sm text-emerald-700 dark:text-emerald-300">
                  ₱{(Number(activePaymentModalOb.monthly_amount || activePaymentModalOb.amount) * 2).toLocaleString()}
                </span>
              </button>

              {/* Option 3: Pay Remaining Balance in Full */}
              {activePaymentModalOb.remaining_balance > 0 && (
                <button
                  type="button"
                  onClick={() => handleMarkPaid(activePaymentModalOb.id, 999, activePaymentModalOb.remaining_balance)}
                  className="w-full p-3 rounded-xl border border-amber-300/80 dark:border-amber-700/80 bg-amber-50/40 dark:bg-amber-950/40 text-left transition flex items-center justify-between cursor-pointer group"
                >
                  <div>
                    <p className="font-bold text-xs text-amber-900 dark:text-amber-300">
                      {isTL ? 'Bayaran Nang Buo ang Natitirang Utang 🎉' : 'Pay Full Remaining Balance in Full 🎉'}
                    </p>
                    <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80">
                      {isTL ? 'Awtomatikong magiging Fully Paid at hindi na mababawas sa susunod.' : 'Fully clears obligation and eliminates all future deductions.'}
                    </p>
                  </div>
                  <span className="font-black text-sm text-amber-700 dark:text-amber-300">
                    ₱{Number(activePaymentModalOb.remaining_balance).toLocaleString()}
                  </span>
                </button>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActivePaymentModalOb(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer"
              >
                {isTL ? 'Isara' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Obligation Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-1 font-['Plus_Jakarta_Sans']">
              {editingObligation 
                ? (isTL ? 'I-edit ang Bayarin / Utang ✏️' : 'Edit Obligation / Debt ✏️')
                : (isTL ? 'Magdagdag ng Bagong Bayarin / Utang 📋' : 'Add New Obligation / Debt 📋')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {isTL ? 'Ilista ang fixed bills, utilities, o utang na may takdang buwan.' : 'Enter bill details to automatically reserve budget on payday.'}
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  {isTL ? 'Kategorya' : 'Category'}
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    setCategory(newCat);
                    if (newCat === 'electricity' || newCat === 'water') {
                      setIsVariable(true);
                      if (!name) setName(newCat === 'electricity' ? 'Electricity (Meralco)' : 'Water Bill');
                      if (!amount) setAmount(newCat === 'electricity' ? '1500' : '450');
                    } else if (newCat === 'loan') {
                      setIsInstallment(true);
                      setIsVariable(false);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm font-semibold"
                >
                  <option value="electricity">Electricity / Power (Kuryente/Meralco)</option>
                  <option value="water">Water Bill (Tubig/Maynilad/Manila Water)</option>
                  <option value="internet">Internet / Wifi (PLDT/Converge/Globe)</option>
                  <option value="rent">House Rent (Upa sa Bahay)</option>
                  <option value="loan">Loan / Personal Debt (Utang kay Aunt/Tito)</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="phone">Phone & Load</option>
                  <option value="other">Other Obligation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  {isTL ? 'Pangalan ng Bayarin / Utang' : 'Bill / Debt Name'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Meralco, Maynilad, Converge, Utang kay Aunt Maria"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                    {isVariable 
                      ? (isTL ? 'Tinatayang Halaga (₱ Est.)' : 'Estimated Amount (₱)') 
                      : (isInstallment ? (isTL ? 'Halaga Bawat Buwan (₱)' : 'Monthly Payment (₱)') : (isTL ? 'Halaga (₱)' : 'Amount (₱)'))}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={isVariable ? (category === 'electricity' ? '1500.00 (Est)' : '450.00 (Est)') : '2000.00'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 font-black text-base focus:ring-2 focus:ring-emerald-500"
                  />
                  {isVariable && (
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold block mt-1">
                      {isTL ? '💡 Awtomatikong mag-aadjust sa actual bill pag nagbayad.' : '💡 Rolling prediction based on past payments.'}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                    {isTL ? 'Araw ng Due (1-31)' : 'Due Day (1-31)'}
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

              {/* Variable Bill Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isVar"
                  checked={isVariable}
                  onChange={(e) => setIsVariable(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <label htmlFor="isVar" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  {isTL ? 'Pabago-bago ang halaga bawat buwan (Variable: Kuryente, Tubig)' : 'Amount fluctuates every month (Variable: Electricity, Water)'}
                </label>
              </div>

              {/* Installment / Fixed-Term Checkbox */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isInst"
                    checked={isInstallment}
                    onChange={(e) => {
                      setIsInstallment(e.target.checked);
                      if (e.target.checked && category !== 'loan') {
                        setCategory('loan');
                        setIsVariable(false);
                      }
                    }}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="isInst" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer flex items-center gap-1">
                    <span>⏳ {isTL ? 'Ito ay may takdang buwan / hulugan (Installment Debt)' : 'Fixed-term installment debt with end date'}</span>
                  </label>
                </div>

                {isInstallment && (
                  <div className="grid grid-cols-2 gap-2.5 pt-1 animate-in fade-in duration-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        {isTL ? 'Matatapos sa Buwan:' : 'End Month:'}
                      </label>
                      <select
                        value={endMonth}
                        onChange={(e) => setEndMonth(parseInt(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold"
                      >
                        {MONTH_NAMES[language].map((m, idx) => (
                          <option key={idx + 1} value={idx + 1}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        {isTL ? 'Taon:' : 'Year:'}
                      </label>
                      <select
                        value={endYear}
                        onChange={(e) => setEndYear(parseInt(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold"
                      >
                        <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                        <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
                        <option value={new Date().getFullYear() + 2}>{new Date().getFullYear() + 2}</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditingObligation(null);
                  }}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer"
                >
                  {isTL ? 'Kanselahin' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition cursor-pointer"
                >
                  {editingObligation 
                    ? (isTL ? 'I-update ang Bayarin' : 'Update Obligation')
                    : (isTL ? 'I-save ang Bayarin' : 'Save Obligation')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
