import React, { useEffect, useState } from 'react';
import { TrendingUp, PieChart, AlertTriangle, CheckCircle2, ShieldCheck, DollarSign, Sparkles } from 'lucide-react';
import * as api from '../services/api';
import { useLanguageStore } from '../stores/useLanguageStore';

export function ReportsPage() {
  const { language, t } = useLanguageStore();
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
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-medium">{t('loading')}</p>
      </div>
    );
  }

  const health = data?.health || {};
  const categories = data?.categories || [];
  const moods = data?.moods || [];
  const dailyTrend = data?.dailyTrend || [];

  const totalSpent = health.totalExpenses || 0;
  const needSpent = moods.find(m => m.name === 'need')?.total || 0;
  const wantSpent = moods.find(m => m.name === 'want')?.total || 0;
  const regretSpent = moods.find(m => m.name === 'regret')?.total || 0;

  const needPct = totalSpent > 0 ? Math.round((needSpent / totalSpent) * 100) : 0;
  const wantPct = totalSpent > 0 ? Math.round((wantSpent / totalSpent) * 100) : 0;
  const regretPct = totalSpent > 0 ? Math.round((regretSpent / totalSpent) * 100) : 0;

  const getHealthTitle = (score) => {
    if (score >= 80) return t('score_healthy');
    if (score >= 60) return t('score_attention');
    return t('score_risk');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
          {t('reports_header')}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
          {t('reports_subheader')}
        </p>
      </div>

      {/* Financial Health Score Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4" />
              <span>{t('health_score_badge')}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black font-['Plus_Jakarta_Sans']">
              {getHealthTitle(health.score)}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
              {t('score_explanation', {
                obligationsRatio: health.obligationsRatio || 0,
                regretPercentage: health.regretPercentage || 0
              })}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-800/80 p-5 rounded-2xl border border-slate-700/60 flex-shrink-0">
            <div className="text-5xl font-black font-['Plus_Jakarta_Sans'] text-emerald-400">
              {health.score || 0}
            </div>
            <div className="text-xs text-slate-400 font-medium">
              <span>/ 100</span>
              <p className="text-[10px] text-emerald-300 font-bold mt-0.5">{t('calculated_score_label')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mood Distribution: Need vs Want vs Regret */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">
              {t('needs_title')}
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-slate-100">{needPct}%</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-50">₱{needSpent.toLocaleString()}</p>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3">
            <div className="bg-green-500 rounded-full h-2" style={{ width: `${needPct}%` }}></div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">{t('needs_desc')}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
              {t('wants_title')}
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-slate-100">{wantPct}%</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-50">₱{wantSpent.toLocaleString()}</p>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3">
            <div className="bg-blue-500 rounded-full h-2" style={{ width: `${wantPct}%` }}></div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">{t('wants_desc')}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
              {t('regrets_title')}
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-slate-100">{regretPct}%</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-50">₱{regretSpent.toLocaleString()}</p>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3">
            <div className="bg-red-500 rounded-full h-2" style={{ width: `${regretPct}%` }}></div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">{t('regrets_desc')}</p>
        </div>

      </div>

      {/* Category Breakdown & Daily Spending Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 mb-4 font-['Plus_Jakarta_Sans']">
            {language === 'tl' ? 'Gastos Bawat Kategorya' : 'Spending by Category'}
          </h3>
          <div className="space-y-3">
            {categories.length > 0 ? (
              categories.map((c, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <span className="capitalize font-bold text-xs text-slate-800 dark:text-slate-200">{c.category}</span>
                  <span className="font-black text-xs text-slate-900 dark:text-slate-50">₱{Number(c.total).toLocaleString()}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">{t('no_expenses_logged')}</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 mb-4 font-['Plus_Jakarta_Sans']">
            {language === 'tl' ? 'Kamakailang Pacing ng Gastos' : 'Recent Daily Spending Trend'}
          </h3>
          <div className="space-y-3">
            {dailyTrend.length > 0 ? (
              dailyTrend.map((d, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{d.expense_date}</span>
                  <span className="font-black text-xs text-red-600 dark:text-red-400">-₱{Number(d.daily_total).toLocaleString()}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">{t('no_expenses_logged')}</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
