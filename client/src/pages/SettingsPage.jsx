import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Download, CheckCircle2, User, Calendar } from 'lucide-react';
import * as api from '../services/api';
import { useBudgetStore } from '../stores/useBudgetStore';

export function SettingsPage() {
  const { loadDashboard } = useBudgetStore();
  const [data, setData] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [civilStatus, setCivilStatus] = useState('single');
  const [salaryAmount, setSalaryAmount] = useState('');
  const [paySchedule, setPaySchedule] = useState('15_30');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api.fetchSettings().then((res) => {
      if (res.success) {
        setData(res);
        if (res.user) {
          setName(res.user.name || '');
          setEmail(res.user.email || '');
          setCivilStatus(res.user.civil_status || 'single');
        }
        if (res.incomes?.length) {
          setSalaryAmount(res.incomes[0].amount.toString());
        }
        if (res.settings?.pay_schedule) {
          setPaySchedule(res.settings.pay_schedule);
        }
      }
    });
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateProfile({
        name,
        email,
        civil_status: civilStatus,
        salary_amount: parseFloat(salaryAmount) || 0,
        pay_schedule: paySchedule
      });
      await loadDashboard();
      alert('Profile updated successfully! 🎉');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const dump = await api.exportData();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dump, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `budgetph_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
          Settings & Profile ⚙️
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
          Pamahalaan ang iyong account profile, salary schedule, at data backup.
        </p>
      </div>

      {/* Profile Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 mb-6 font-['Plus_Jakarta_Sans'] flex items-center gap-2">
          <User className="w-5 h-5 text-green-600" />
          <span>Personal & Financial Info</span>
        </h3>

        <form onSubmit={handleSaveProfile} className="space-y-5">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">Pangalan</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">Civil Status</label>
              <select
                value={civilStatus}
                onChange={(e) => setCivilStatus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm"
              >
                <option value="single">Single</option>
                <option value="married">Married (May Pamilya)</option>
                <option value="separated">Separated</option>
                <option value="widowed">Widowed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">Base Salary (₱)</label>
              <input
                type="number"
                step="0.01"
                value={salaryAmount}
                onChange={(e) => setSalaryAmount(e.target.value)}
                placeholder="30000"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 font-bold text-base"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">Payday Schedule Frequency</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: '15_30', label: '15th & 30th (Kinsenas)', desc: 'Standard Semi-Monthly' },
                { id: 'bi_weekly', label: 'Bi-Weekly', desc: 'Every 2 Weeks' },
                { id: 'monthly', label: 'Monthly', desc: 'Once a Month' }
              ].map(s => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setPaySchedule(s.id)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    paySchedule === s.id
                      ? 'border-green-600 bg-green-50 dark:bg-green-950/60 text-green-900 dark:text-green-300 font-bold'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <p className="text-xs font-bold">{s.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>

        </form>
      </div>

      {/* Data Backup Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans'] flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600" />
            <span>Data Export & Backup</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            I-download ang kompletong backup ng iyong mga transactions, bills, at cycle history sa JSON format.
          </p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 transition cursor-pointer flex-shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export JSON</span>
        </button>
      </div>

    </div>
  );
}
