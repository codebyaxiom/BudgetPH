import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Users, Calendar, Banknote, Sparkles } from 'lucide-react';
import * as api from '../services/api';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useLanguageStore } from '../stores/useLanguageStore';

const PERIOD_LABELS = {
  daily: { en: 'Daily', tl: 'Araw-araw' },
  weekly: { en: 'Weekly', tl: 'Lingguhan' },
  monthly: { en: 'Monthly', tl: 'Buwanan' },
  'per-payday': { en: 'Per Payday', tl: 'Kada Sahod' }
};

const ROLE_LABELS = {
  child: { en: 'Child / Student', tl: 'Anak / Estudyante' },
  spouse: { en: 'Spouse / Partner', tl: 'Asawa' },
  parent: { en: 'Parent (Nanay / Tatay)', tl: 'Magulang (Nanay / Tatay)' },
  sibling: { en: 'Sibling (Kapatid)', tl: 'Kapatid' },
  other: { en: 'Other Dependent', tl: 'Iba pang Dependents' }
};

export function AllowancesPage() {
  const { loadDashboard } = useBudgetStore();
  const { language, t } = useLanguageStore();
  const isTL = language === 'tl';

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAllowance, setEditingAllowance] = useState(null);
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('child');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState('daily');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    try {
      const res = await api.fetchAllowances();
      if (res.success) setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingAllowance(null);
    setMemberName('');
    setMemberRole('child');
    setAmount('');
    setPeriod('daily');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (al) => {
    setEditingAllowance(al);
    setMemberName(al.member_name || '');
    setMemberRole(al.member_role || 'child');
    setAmount(al.amount?.toString() || '');
    setPeriod(al.period || 'daily');
    setNotes(al.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!memberName || !amount) return;

    try {
      if (editingAllowance) {
        await api.updateFamilyMember(editingAllowance.family_member_id, {
          name: memberName,
          role: memberRole
        });
        await api.saveAllowance({
          id: editingAllowance.id,
          family_member_id: editingAllowance.family_member_id,
          amount: parseFloat(amount),
          period,
          notes
        });
      } else {
        const memberRes = await api.addFamilyMember({
          name: memberName,
          role: memberRole
        });
        await api.saveAllowance({
          family_member_id: memberRes.id,
          amount: parseFloat(amount),
          period,
          notes
        });
      }

      setIsModalOpen(false);
      setEditingAllowance(null);
      await loadData();
      await loadDashboard();
    } catch (err) {
      alert('Error saving allowance: ' + err.message);
    }
  };

  const handleDelete = async (al) => {
    const confirmMsg = isTL
      ? `Sigurado ka bang nais mong tanggalin ang allowance ni "${al.member_name}"?`
      : `Are you sure you want to remove the allowance for "${al.member_name}"?`;

    if (!confirm(confirmMsg)) return;

    try {
      await api.deleteAllowance(al.id);
      await api.deleteFamilyMember(al.family_member_id);
      await loadData();
      await loadDashboard();
    } catch (err) {
      alert('Error deleting allowance: ' + err.message);
    }
  };

  const allowances = data?.allowances || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans'] flex items-center gap-2.5">
            <span>{isTL ? 'Mga Allowance at Baon ng Pamilya' : 'Family Allowances & Baon'}</span>
            <span>👨‍👩‍👧‍👦</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {isTL 
              ? 'Pamahalaan at i-track ang regular allowances para sa asawa, mga anak, at magulang.'
              : 'Track and manage regular baon and allowances for children, spouse, and dependents.'}
          </p>
        </div>
        
        <button
          onClick={handleOpenAdd}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isTL ? 'Magdagdag ng Allowance' : 'Add Family Allowance'}</span>
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {isTL ? 'Nakarehistrong Miyembro' : 'Registered Dependents'}
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-50 mt-1 font-['Plus_Jakarta_Sans']">
            {allowances.length} <span className="text-sm font-medium text-slate-500">{isTL ? 'miyembro' : 'family members'}</span>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {isTL ? 'Aktibong Schedules' : 'Active Schedules'}
          </span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-['Plus_Jakarta_Sans']">
            {allowances.length} <span className="text-sm font-medium text-slate-500">{isTL ? 'nakatakda' : 'allowances'}</span>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {isTL ? 'Kabuuang Nakalaan' : 'Total Allocated'}
          </span>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 font-['Plus_Jakarta_Sans']">
            ₱{Number(data?.totalAllocated || 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Allowances Cards Grid */}
      {allowances.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-12 text-center">
          <span className="text-4xl">👨‍👩‍👦</span>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-3 font-['Plus_Jakarta_Sans']">
            {isTL ? 'Wala pang nakatalang family allowance' : 'No family allowances registered yet'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            {isTL 
              ? 'Magdagdag ng miyembro ng pamilya o anak para mai-budget ang kanilang daily baon o regular na padala.'
              : 'Add family members or children to budget their daily school allowance or family support.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
          >
            {isTL ? '+ Unang Allowance' : '+ Add First Allowance'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {allowances.map((al) => {
            const roleText = ROLE_LABELS[al.member_role]?.[language] || al.member_role;
            const periodText = PERIOD_LABELS[al.period]?.[language] || al.period;

            return (
              <div
                key={al.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 p-5 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700/60 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-black flex items-center justify-center text-sm shadow-xs">
                        {al.member_name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight">
                          {al.member_name}
                        </h3>
                        <span className="inline-block text-[11px] font-semibold text-slate-400 dark:text-slate-500 capitalize">
                          {roleText}
                        </span>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold capitalize border border-emerald-200 dark:border-emerald-800/80">
                      {periodText}
                    </span>
                  </div>

                  <div className="my-3">
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                      {isTL ? 'Halaga ng Allowance' : 'Allowance Amount'}
                    </p>
                    <p className="text-2xl font-black font-['Plus_Jakarta_Sans'] text-slate-900 dark:text-slate-50 tracking-tight">
                      ₱{Number(al.amount).toLocaleString()}
                    </p>
                    {al.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic line-clamp-2">
                        "{al.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => handleOpenEdit(al)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{isTL ? 'I-edit' : 'Edit'}</span>
                  </button>

                  <button
                    onClick={() => handleDelete(al)}
                    className="px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isTL ? 'Tanggalin' : 'Remove'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Unified Add / Edit Allowance Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-1 font-['Plus_Jakarta_Sans']">
              {editingAllowance 
                ? (isTL ? 'I-edit ang Family Allowance ✏️' : 'Edit Family Allowance ✏️')
                : (isTL ? 'Magdagdag ng Family Allowance 👨‍👩‍👧' : 'Add Family Allowance 👨‍👩‍👧')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {isTL 
                ? 'Itakda ang miyembro ng pamilya, halaga, at frequency ng regular allowance.'
                : 'Set family dependent, baon amount, and regular release frequency.'}
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  {isTL ? 'Pangalan / Palayaw' : 'Name / Nickname'}
                </label>
                <input
                  type="text"
                  required
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="e.g. Farzam, Sofia, Nanay, Bunso"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  {isTL ? 'Tungkulin / Relasyon' : 'Role / Relationship'}
                </label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm font-semibold"
                >
                  <option value="child">{isTL ? 'Anak (Baon / School)' : 'Child (Baon / Student)'}</option>
                  <option value="spouse">{isTL ? 'Asawa (Household partner)' : 'Spouse (Partner)'}</option>
                  <option value="parent">{isTL ? 'Magulang (Nanay / Tatay)' : 'Parent (Nanay / Tatay)'}</option>
                  <option value="sibling">{isTL ? 'Kapatid (Sibling)' : 'Sibling'}</option>
                  <option value="other">{isTL ? 'Iba pang Dependent' : 'Other Dependent'}</option>
                </select>
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
                    placeholder="100.00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 font-black text-base focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                    {isTL ? 'Kadalasan / Frequency' : 'Frequency / Period'}
                  </label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm font-semibold"
                  >
                    <option value="daily">{isTL ? 'Araw-araw (Daily Baon)' : 'Daily (Baon)'}</option>
                    <option value="weekly">{isTL ? 'Lingguhan (Weekly)' : 'Weekly'}</option>
                    <option value="monthly">{isTL ? 'Buwanan (Monthly)' : 'Monthly'}</option>
                    <option value="per-payday">{isTL ? 'Kada Sahod (Per Cut-off)' : 'Per Payday (Cut-off)'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  {isTL ? 'Mga Tala (Opsyonal)' : 'Notes / Description (Optional)'}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isTL ? 'hal. Baon para sa tanghalian at meryenda' : 'e.g. Baon for lunch and snacks'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingAllowance(null);
                  }}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer"
                >
                  {isTL ? 'Kanselahin' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition cursor-pointer"
                >
                  {editingAllowance 
                    ? (isTL ? 'I-save ang Pagbabago' : 'Save Changes') 
                    : (isTL ? 'Idagdag ang Allowance' : 'Add Allowance')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
