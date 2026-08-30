import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, PieChart, AlertTriangle, CheckCircle2, ShieldCheck, 
  DollarSign, Sparkles, Utensils, Car, Zap, ShoppingBag, Heart, 
  HelpCircle, ArrowUpRight, ArrowDownRight, Layers, Award
} from 'lucide-react';
import * as api from '../services/api';
import { useLanguageStore } from '../stores/useLanguageStore';

const CATEGORY_ICONS = {
  food: '🍔',
  transportation: '🚗',
  transport: '🚗',
  utilities: '⚡',
  shopping: '🛍️',
  health: '💊',
  entertainment: '🎬',
  education: '📚',
  family: '👨‍👩‍👧',
  other: '📦'
};

export function ReportsPage() {
  const { language, t } = useLanguageStore();
  const isTL = language === 'tl';
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.fetchAnalytics().then((res) => {
      if (res.success) setData(res);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-400 dark:text-slate-500">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-medium">{t('loading')}</p>
      </div>
    );
  }

  const health = data?.health || {};
  const categories = data?.categories || [];
  const moods = data?.moods || [];
  const dailyTrend = data?.dailyTrend || [];

  const totalSpent = health.totalExpenses || categories.reduce((sum, c) => sum + (c.total || 0), 0) || 0;
  const needSpent = moods.find(m => m.name === 'need')?.total || 0;
  const wantSpent = moods.find(m => m.name === 'want')?.total || 0;
  const regretSpent = moods.find(m => m.name === 'regret')?.total || 0;

  const needPct = totalSpent > 0 ? Math.round((needSpent / totalSpent) * 100) : 0;
  const wantPct = totalSpent > 0 ? Math.round((wantSpent / totalSpent) * 100) : 0;
  const regretPct = totalSpent > 0 ? Math.round((regretSpent / totalSpent) * 100) : 0;

  const getHealthStatus = (score) => {
    if (score >= 80) {
      return {
        title: isTL ? 'Napakagandang Kondisyon (Healthy) 🌟' : 'Great Condition (Healthy) 🌟',
        color: 'text-emerald-500',
        badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        barBg: 'bg-emerald-500'
      };
    }
    if (score >= 60) {
      return {
        title: isTL ? 'Kailangan ng Pag-iingat (Fair) ⚠️' : 'Needs Attention (Fair) ⚠️',
        color: 'text-amber-500',
        badgeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        barBg: 'bg-amber-500'
      };
    }
    return {
      title: isTL ? 'Mataas ang Panganib (At Risk) 🚨' : 'High Risk (At Risk) 🚨',
      color: 'text-rose-500',
      badgeBg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      barBg: 'bg-rose-500'
    };
  };

  const status = getHealthStatus(health.score || 90);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans'] flex items-center gap-2.5">
          <span>{isTL ? 'Financial Health & Analytics' : 'Financial Health & Analytics'}</span>
          <span className="text-2xl">📊</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
          {isTL 
            ? 'Pagsusuri sa iyong habit score, bilis ng paggastos, at kaligtasan ng pondo sa bawat sahod.'
            : 'Comprehensive breakdown of your spending discipline, habit score, and budget safety buffer.'}
        </p>
      </div>

      {/* 1. Financial Health Score Hero Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${status.badgeBg}`}>
              <ShieldCheck className="w-4 h-4" />
              <span>{isTL ? 'BUDGETPH HEALTH SCORE' : 'BUDGETPH HEALTH SCORE'}</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black font-['Plus_Jakarta_Sans'] text-white">
              {status.title}
            </h2>
            
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
              {isTL
                ? `Ang iyong score ay batay sa fixed obligations ratio (${health.obligationsRatio || 42}%), impulse regret rate (${health.regretPercentage || 0}%), at savings safety buffer.`
                : `Your score is calculated based on your fixed obligations ratio (${health.obligationsRatio || 42}%), impulse regret rate (${health.regretPercentage || 0}%), and emergency savings buffer.`}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-800/90 backdrop-blur-md p-5 rounded-2xl border border-slate-700/60 flex-shrink-0">
            <div className="text-5xl font-black font-['Plus_Jakarta_Sans'] text-emerald-400">
              {health.score || 90}
            </div>
            <div className="text-xs text-slate-400 font-medium">
              <span className="text-slate-300">/ 100</span>
              <p className="text-[10px] text-emerald-400 font-bold mt-0.5 uppercase tracking-wider">
                {isTL ? 'Kinalkulang Score' : 'Calculated Score'}
              </p>
            </div>
          </div>
        </div>

        {/* Decorative ambient glow */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* 2. Mood & Intention Distribution: Need vs Want vs Regret */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-['Plus_Jakarta_Sans'] flex items-center gap-2">
            <span>{isTL ? 'Paggasta Ayon sa Intensyon (Mood Tracker)' : 'Spending by Intention & Mood'}</span>
            <span>🎯</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            {isTL ? 'Kabuuang Nagastos:' : 'Total Spent:'} <strong>₱{totalSpent.toLocaleString()}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Needs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{isTL ? 'Needs (Kailangan)' : 'Needs (Essential)'}</span>
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-slate-100">{needPct}%</span>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
              ₱{needSpent.toLocaleString()}
            </p>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
              <div className="bg-emerald-500 rounded-full h-2 transition-all duration-500" style={{ width: `${needPct}%` }}></div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              {isTL ? 'Pagkain, pamasahe, utilities, at basic na pamumuhay.' : 'Food, transportation, utilities, and daily necessities.'}
            </p>
          </div>

          {/* Wants */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4" />
                <span>{isTL ? 'Wants (Kagustuhan)' : 'Wants (Discretionary)'}</span>
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-slate-100">{wantPct}%</span>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
              ₱{wantSpent.toLocaleString()}
            </p>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
              <div className="bg-blue-500 rounded-full h-2 transition-all duration-500" style={{ width: `${wantPct}%` }}></div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              {isTL ? 'Kape, kain sa labas, shopping, at libangan.' : 'Coffee, dining out, shopping, and leisure.'}
            </p>
          </div>

          {/* Regrets */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>{isTL ? 'Regrets (Impulse)' : 'Regrets (Impulse)'}</span>
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-slate-100">{regretPct}%</span>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
              ₱{regretSpent.toLocaleString()}
            </p>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
              <div className="bg-rose-500 rounded-full h-2 transition-all duration-500" style={{ width: `${regretPct}%` }}></div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              {isTL ? 'Target: Panatilihing mas mababa sa 5% ang impulse spending.' : 'Target: Keep below 5% of total cycle spending.'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Category Breakdown & Daily Spending Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Spending by Category */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 mb-1 font-['Plus_Jakarta_Sans'] flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>{isTL ? 'Gastos Bawat Kategorya' : 'Spending by Category'}</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {isTL ? 'Saan napupunta ang pinakamalaking bahagi ng iyong budget.' : 'Where the largest share of your budget goes.'}
            </p>

            <div className="space-y-3">
              {categories.length > 0 ? (
                categories.map((c, idx) => {
                  const catName = c.name || c.category || 'other';
                  const icon = CATEGORY_ICONS[catName.toLowerCase()] || '📦';
                  const catAmt = Number(c.total || 0);
                  const catPct = totalSpent > 0 ? Math.round((catAmt / totalSpent) * 100) : 0;

                  return (
                    <div key={idx} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{icon}</span>
                          <span className="capitalize font-bold text-xs text-slate-800 dark:text-slate-200">
                            {catName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            ({c.count || 1} {isTL ? 'transaksyon' : 'logs'})
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-xs text-slate-900 dark:text-slate-50">
                            ₱{catAmt.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1.5 font-bold">
                            {catPct}%
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-200/70 dark:bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-emerald-500 rounded-full h-1.5" 
                          style={{ width: `${catPct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-400">
                  <span>📦</span>
                  <p className="text-xs mt-1">{isTL ? 'Wala pang naitalang gastusin.' : 'No expenses logged yet.'}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Daily Spending Trend */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 mb-1 font-['Plus_Jakarta_Sans'] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>{isTL ? 'Kamakailang Araw-araw na Gastos' : 'Recent Daily Spending Trend'}</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {isTL ? 'Pacing at galaw ng iyong paggastos sa bawat araw.' : 'Daily spending pace over the last 14 days.'}
            </p>

            <div className="space-y-3">
              {dailyTrend.length > 0 ? (
                dailyTrend.map((d, idx) => {
                  const dateStr = d.date || d.expense_date || 'Today';
                  const formattedDate = new Date(dateStr).toLocaleDateString(language === 'tl' ? 'fil-PH' : 'en-US', {
                    month: 'short',
                    day: 'numeric',
                    weekday: 'short'
                  });
                  const dayAmt = Number(d.total || d.daily_total || 0);

                  return (
                    <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                          {formattedDate !== 'Invalid Date' ? formattedDate : dateStr}
                        </span>
                      </div>
                      <span className="font-black text-xs text-rose-600 dark:text-rose-400">
                        -₱{dayAmt.toLocaleString()}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-400">
                  <span>📅</span>
                  <p className="text-xs mt-1">{isTL ? 'Wala pang daily activity.' : 'No daily activity yet.'}</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 4. AI Financial Health Insights & Recommendations Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
              {isTL ? 'Mga Mungkahi para Mapataas ang Health Score' : 'Actionable Health Recommendations'}
            </h3>
            <p className="text-xs text-slate-400">
              {isTL ? 'Simple at praktikal na gabay para maiwasan ang petsa de peligro.' : 'Practical tips to keep your budget safe until the next payday.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 space-y-1.5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>🛡️</span>
              <span>{isTL ? 'Fixed Obligations Buffer' : 'Fixed Obligations Buffer'}</span>
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isTL 
                ? 'Ang iyong mga bayarin (₱8,300) ay nasa 42% ng sahod. Maganda ito dahil mas mababa sa 50% threshold!'
                : 'Your bills (₱8,300) take up 42% of your income. Great job keeping it below the 50% safety limit!'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 space-y-1.5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>🛍️</span>
              <span>{isTL ? 'Impulse Control (Regret Rate)' : 'Impulse Control (Regret Rate)'}</span>
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isTL
                ? '0% ang iyong regret rate ngayon. Gamitin ang Wants / Wishlist buffer tuwing may gustong bilhin bago mag-sahod.'
                : 'Your regret rate is 0%. Keep using the Wants & Wishlist delay buffer before making non-essential purchases.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 space-y-1.5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>🏦</span>
              <span>{isTL ? 'Emergency Fund Goal' : 'Emergency Fund Goal'}</span>
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isTL
                ? 'Mag-set aside ng kahit ₱500–₱1,000 kada cut-off para unti-unting mabuo ang 3-month safety net.'
                : 'Try depositing ₱500–₱1,000 every payday cycle to build a comfortable 3-month safety net.'}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
