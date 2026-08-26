import React, { useEffect, useState } from 'react';
import { TrendingUp, PieChart, AlertTriangle, CheckCircle2, ShieldCheck, DollarSign, Sparkles } from 'lucide-react';
import * as api from '../services/api';

export function ReportsPage() {
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
        <p className="text-sm font-medium">Kinakalkula ang analytics at health score...</p>
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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
          Financial Health & Analytics 📊
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
          Komprehensibong pagsusuri sa iyong mga nagastos, mood discipline, at budget health score.
        </p>
      </div>

      {/* Financial Health Score Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4" />
              <span>BudgetPH Health Score</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black font-['Plus_Jakarta_Sans']">
              {health.score >= 80 ? '🌟 Magandang Kalagayan (Healthy)' : health.score >= 60 ? '⚠️ Katamtaman (Needs Attention)' : '🚨 Kritikal (High Risk)'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
              Ang iyong score ay batay sa fixed obligations ratio ({health.obligationsRatio}%), regret rate ({health.regretPercentage}%), at savings buffer.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-800/80 p-5 rounded-2xl border border-slate-700/60 flex-shrink-0">
            <div className="text-5xl font-black font-['Plus_Jakarta_Sans'] text-emerald-400">
              {health.score}
            </div>
            <div className="text-xs text-slate-400 font-medium">
              <span>/ 100</span>
              <p className="text-[10px] text-emerald-300 font-bold mt-0.5">Calculated Score</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mood Distribution: Need vs Want vs Regret */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">✅ Needs (Kailangan)</span>
            <span className="text-sm font-black text-slate-900 dark:text-slate-100">{needPct}%</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-50">₱{needSpent.toLocaleString()}</p>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3">
            <div className="bg-green-500 rounded-full h-2" style={{ width: `${needPct}%` }}></div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Pagkain, pamasahe, at basic bills</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">🛍️ Wants (Gusto / Luho)</span>
            <span className="text-sm font-black text-slate-900 dark:text-slate-100">{wantPct}%</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-50">₱{wantSpent.toLocaleString()}</p>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3">
            <div className="bg-blue-500 rounded-full h-2" style={{ width: `${wantPct}%` }}></div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Kape, shopping, dining out, recreation</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">😬 Regrets (Sayang na Gastos)</span>
            <span className="text-sm font-black text-slate-900 dark:text-slate-100">{regretPct}%</span>
          </div>
          <p className="text-2xl font-black text-red-600 dark:text-red-400">₱{regretSpent.toLocaleString()}</p>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3">
            <div className="bg-red-500 rounded-full h-2" style={{ width: `${regretPct}%` }}></div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Target: Panatilihing mas mababa sa 5%</p>
        </div>

      </div>

      {/* Category Breakdown Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 mb-4 font-['Plus_Jakarta_Sans']">
          Breakdown Ayon sa Kategorya
        </h3>

        {categories.length > 0 ? (
          <div className="space-y-4">
            {categories.map((cat, idx) => {
              const pct = totalSpent > 0 ? Math.round((cat.total / totalSpent) * 100) : 0;
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="capitalize text-slate-800 dark:text-slate-200">{cat.name} ({cat.count}x)</span>
                    <span className="text-slate-900 dark:text-slate-50">₱{cat.total.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5">
                    <div
                      className="bg-emerald-500 rounded-full h-2.5 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-6 text-center">Wala pang sapat na data para sa category breakdown.</p>
        )}
      </div>

    </div>
  );
}
