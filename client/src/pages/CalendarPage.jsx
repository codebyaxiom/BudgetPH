import React, { useEffect, useState } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, DollarSign, 
  Receipt, CheckCircle2, AlertCircle, AlertTriangle, Sparkles, X, Plus, Clock, 
  ArrowRight, ShieldCheck, Tag, ShoppingBag, Utensils, Car, Zap
} from 'lucide-react';
import * as api from '../services/api';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useLanguageStore } from '../stores/useLanguageStore';
import { getBillDueStatus } from '../utils/billStatus';

const CATEGORY_ICONS = {
  food: '🍔',
  transportation: '🚗',
  transport: '🚗',
  utilities: '⚡',
  electricity: '⚡',
  internet: '🌐',
  water: '💧',
  rent: '🏠',
  loan: '💳',
  credit_card: '💳',
  shopping: '🛍️',
  health: '💊',
  entertainment: '🎬',
  education: '📚',
  family: '👨‍👩‍👧',
  other: '📦'
};

const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_TL = ['Lin', 'Lun', 'Mar', 'Mye', 'Hwe', 'Biy', 'Sab'];

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTHS_TL = [
  'Enero', 'Pebrero', 'Marso', 'Abril', 'Mayo', 'Hunyo',
  'Hulyo', 'Agosto', 'Setyembre', 'Oktubre', 'Nobyembre', 'Disyembre'
];

export function CalendarPage({ setActiveTab }) {
  const { loadDashboard, openExpenseModal } = useBudgetStore();
  const { language, t } = useLanguageStore();
  const isTL = language === 'tl';

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-12
  const [calendarData, setCalendarData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null); // 'YYYY-MM-DD'

  const monthString = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const loadData = async (mStr) => {
    setIsLoading(true);
    try {
      const res = await api.fetchCalendarData(mStr);
      if (res.success) {
        setCalendarData(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(monthString);
  }, [monthString]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleToday = () => {
    const d = new Date();
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth() + 1);
    setSelectedDay(d.toISOString().split('T')[0]);
  };

  const handleMarkPaid = async (obId) => {
    await api.markObligationPaid({
      obligation_id: obId,
      paid_date: selectedDay || new Date().toISOString().split('T')[0]
    });
    await loadData(monthString);
    await loadDashboard();
  };

  const handleUnmarkPaid = async (obId) => {
    await api.unmarkObligationPaid(obId);
    await loadData(monthString);
    await loadDashboard();
  };

  // Generate Month Grid Days
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0-6 (Sun-Sat)
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate();

  const gridCells = [];

  // Previous month trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    gridCells.push({
      dayNumber: daysInPrevMonth - i,
      dateStr: null,
      isCurrentMonth: false
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    gridCells.push({
      dayNumber: day,
      dateStr,
      isCurrentMonth: true
    });
  }

  // Next month leading days to complete grid (multiples of 7)
  const remainingCells = 7 - (gridCells.length % 7);
  if (remainingCells < 7) {
    for (let day = 1; day <= remainingCells; day++) {
      gridCells.push({
        dayNumber: day,
        dateStr: null,
        isCurrentMonth: false
      });
    }
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const summary = calendarData?.summary || {};
  const dailyExpenses = calendarData?.dailyExpenses || {};
  const obligations = calendarData?.obligations || [];
  const paydayCycles = calendarData?.paydayCycles || [];

  // Selected Day Details
  const selectedDayExpenses = selectedDay && dailyExpenses[selectedDay] ? dailyExpenses[selectedDay] : null;
  const selectedDayNumber = selectedDay ? parseInt(selectedDay.split('-')[2]) : null;
  const selectedDayBills = selectedDay ? obligations.filter(o => o.due_day === selectedDayNumber) : [];
  const selectedDayPayday = selectedDay ? paydayCycles.find(p => p.payday_date === selectedDay || p.next_payday_date === selectedDay) : null;

  const weekdays = isTL ? WEEKDAYS_TL : WEEKDAYS_EN;
  const monthName = isTL ? MONTHS_TL[currentMonth - 1] : MONTHS_EN[currentMonth - 1];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans'] flex items-center gap-2.5">
            <span>{t('calendar_header')}</span>
            <span>🗓️</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {t('calendar_subheader')}
          </p>
        </div>

        {/* Month Navigation & Summary Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-4 text-sm font-extrabold text-slate-900 dark:text-slate-100 font-['Plus_Jakarta_Sans'] min-w-[140px] text-center">
              {monthName} {currentYear}
            </span>

            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            {t('today_btn')}
          </button>
        </div>
      </div>

      {/* Monthly Metrics Ticker */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            {t('total_month_spent')}
          </span>
          <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5 font-['Plus_Jakarta_Sans']">
            -₱{Number(summary.totalExpenses || 0).toLocaleString()}
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            {t('total_month_bills')}
          </span>
          <p className="text-xl font-black text-slate-900 dark:text-slate-50 mt-0.5 font-['Plus_Jakarta_Sans']">
            ₱{Number(summary.totalBills || 0).toLocaleString()}
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {isTL ? 'Bayad Na sa Buwang Ito' : 'Paid This Month'}
          </span>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-['Plus_Jakarta_Sans']">
            ₱{Number(summary.paidBills || 0).toLocaleString()}
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
            {isTL ? 'Pending / Hindi Pa Bayad' : 'Pending Obligations'}
          </span>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5 font-['Plus_Jakarta_Sans']">
            ₱{Number(summary.pendingBills || 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Main Calendar Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
        
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-center py-2.5">
          {weekdays.map((w, idx) => (
            <span 
              key={idx} 
              className={`text-xs font-black uppercase tracking-wider ${
                idx === 0 || idx === 6 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {w}
            </span>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800/80">
          {gridCells.map((cell, idx) => {
            if (!cell.isCurrentMonth) {
              return (
                <div 
                  key={idx} 
                  className="min-h-[100px] p-2 bg-slate-50/30 dark:bg-slate-950/20 text-slate-300 dark:text-slate-700 opacity-40 select-none"
                >
                  <span className="text-xs font-bold">{cell.dayNumber}</span>
                </div>
              );
            }

            const isToday = cell.dateStr === todayStr;
            const isSelected = cell.dateStr === selectedDay;
            const dayExpense = dailyExpenses[cell.dateStr];
            const hasSpent = dayExpense && dayExpense.total > 0;
            const dayBills = obligations.filter(o => o.due_day === cell.dayNumber);
            const isPayday = paydayCycles.some(p => p.payday_date === cell.dateStr || p.next_payday_date === cell.dateStr);

            return (
              <div
                key={idx}
                onClick={() => setSelectedDay(cell.dateStr)}
                className={`min-h-[110px] p-2 sm:p-2.5 transition-all flex flex-col justify-between cursor-pointer group relative ${
                  isSelected
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500 dark:ring-emerald-400 z-10'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                {/* Top Row: Date number & Payday badge */}
                <div className="flex items-center justify-between">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition ${
                      isToday
                        ? 'bg-emerald-600 text-white shadow-xs font-black'
                        : isSelected
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-extrabold'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {isPayday && (
                    <span 
                      className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-black flex items-center gap-0.5 shadow-2xs border border-emerald-300 dark:border-emerald-700"
                      title="Payday Cut-off!"
                    >
                      <span>💰</span>
                      <span className="hidden sm:inline">{t('payday_badge')}</span>
                    </span>
                  )}
                </div>

                {/* Middle: Bill Badges */}
                <div className="space-y-1 my-1.5">
                  {dayBills.slice(0, 2).map(b => {
                    const dueInfo = getBillDueStatus(b.due_day, b.is_paid, language);
                    return (
                      <div
                        key={b.id}
                        className={`truncate text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 border ${
                          b.is_paid
                            ? 'bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : dueInfo.isOverdue
                            ? 'bg-rose-100 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800'
                            : dueInfo.isDueToday
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                        title={`${b.name}: ₱${Number(b.amount).toLocaleString()} (${dueInfo.label})`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          dueInfo.isOverdue ? 'bg-rose-500 animate-ping' : 'bg-current'
                        }`}></span>
                        <span className="truncate">{b.name}</span>
                      </div>
                    );
                  })}

                  {dayBills.length > 2 && (
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 pl-1">
                      +{dayBills.length - 2} more bills
                    </span>
                  )}
                </div>

                {/* Bottom: Daily Spend Tag */}
                <div>
                  {hasSpent ? (
                    <div className="text-right">
                      <span className="text-[11px] font-black font-['Plus_Jakarta_Sans'] text-rose-600 dark:text-rose-400">
                        -₱{Number(dayExpense.total).toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <div className="h-4"></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Day Inspector Slide-out Modal / Drawer */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  {t('day_inspector_title')}
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
                  {new Date(selectedDay).toLocaleDateString(isTL ? 'fil-PH' : 'en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h2>
              </div>

              <button
                onClick={() => setSelectedDay(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payday Banner if applicable */}
            {selectedDayPayday && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shadow-md">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                    💰 {isTL ? 'Payday Cut-off Milestone' : 'Payday Cut-off Milestone'}
                  </span>
                  <p className="text-lg font-black font-['Plus_Jakarta_Sans'] mt-0.5">
                    ₱{Number(selectedDayPayday.expected_amount).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab && setActiveTab('payday')}
                  className="px-3.5 py-1.5 bg-white text-emerald-800 text-xs font-black rounded-xl hover:bg-emerald-50 transition cursor-pointer"
                >
                  {isTL ? 'Simulate' : 'View Cycle'}
                </button>
              </div>
            )}

            {/* Bills Due on this Day */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-blue-600" />
                <span>{isTL ? 'Mga Bayarin sa Araw na Ito' : 'Bills Due on This Date'}</span>
              </h3>

              {selectedDayBills.length > 0 ? (
                <div className="space-y-2">
                  {selectedDayBills.map(b => {
                    const dueInfo = getBillDueStatus(b.due_day, b.is_paid, language);
                    return (
                      <div 
                        key={b.id} 
                        className={`p-3 rounded-2xl border flex items-center justify-between transition ${
                          dueInfo.isOverdue 
                            ? 'border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/40' 
                            : 'border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-xs text-slate-900 dark:text-slate-100">{b.name}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${dueInfo.badgeClass}`}>
                              {dueInfo.shortLabel}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-400 capitalize">{b.category}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`font-black text-xs font-['Plus_Jakarta_Sans'] ${
                            dueInfo.isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-50'
                          }`}>
                            ₱{Number(b.amount).toLocaleString()}
                          </span>

                          {b.is_paid ? (
                            <button
                              onClick={() => handleUnmarkPaid(b.id)}
                              className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold rounded-lg hover:underline flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{t('paid_status')}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleMarkPaid(b.id)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg shadow-xs transition cursor-pointer text-white ${
                                dueInfo.isOverdue ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                              }`}
                            >
                              {isTL ? 'Bayaran' : 'Mark Paid'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-1">
                  {isTL ? 'Walang nakatakdang bills sa araw na ito.' : 'No bills due on this date.'}
                </p>
              )}
            </div>

            {/* Expenses Logged on this Day */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-rose-600" />
                  <span>{isTL ? 'Mga Nagastos sa Araw na Ito' : 'Expenses Recorded'}</span>
                </h3>
                {selectedDayExpenses && (
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400 font-['Plus_Jakarta_Sans']">
                    -₱{Number(selectedDayExpenses.total).toLocaleString()}
                  </span>
                )}
              </div>

              {selectedDayExpenses && selectedDayExpenses.items.length > 0 ? (
                <div className="space-y-2">
                  {selectedDayExpenses.items.map(item => {
                    const icon = CATEGORY_ICONS[item.category?.toLowerCase()] || '📦';
                    return (
                      <div 
                        key={item.id}
                        className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{icon}</span>
                          <div>
                            <p className="font-bold text-xs text-slate-900 dark:text-slate-100">{item.description}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-semibold text-slate-400 capitalize">{item.category}</span>
                              {item.family_member_name && (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                  · {item.family_member_name}
                                </span>
                              )}
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-full ${
                                item.mood === 'need' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400' :
                                item.mood === 'want' ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400' :
                                'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400'
                              }`}>
                                {item.mood}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span className="font-black text-xs text-rose-600 dark:text-rose-400 font-['Plus_Jakarta_Sans']">
                          -₱{Number(item.amount).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-1">
                  {isTL ? 'Walang naitalang gastos sa araw na ito.' : 'No expenses logged on this date.'}
                </p>
              )}
            </div>

            {/* Quick Log Action */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => {
                  setSelectedDay(null);
                  openExpenseModal();
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('log_expense')}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
