import React, { useEffect, useState } from 'react';
import { Users, Plus, Edit2, Trash2, CheckCircle2, User, Wallet, Calendar, AlertCircle } from 'lucide-react';
import * as api from '../services/api';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useLanguageStore } from '../stores/useLanguageStore';

export function AllowancesPage() {
  const { loadDashboard } = useBudgetStore();
  const { t, language } = useLanguageStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAllowance, setEditingAllowance] = useState(null);

  // Form state
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('child');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState('daily');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.fetchAllowances();
      if (res.success) setData(res);
    } catch (err) {
      console.error('Failed to load allowances:', err);
    } finally {
      setLoading(false);
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
    setAmount(al.amount.toString());
    setPeriod(al.period || 'daily');
    setNotes(al.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!memberName.trim() || !amount) return;

    try {
      if (editingAllowance) {
        // Update member info
        await api.updateFamilyMember(editingAllowance.family_member_id, {
          name: memberName.trim(),
          role: memberRole
        });

        // Update allowance details
        await api.saveAllowance({
          id: editingAllowance.id,
          family_member_id: editingAllowance.family_member_id,
          amount: parseFloat(amount),
          period,
          notes: notes.trim()
        });
      } else {
        // Create new member then assign allowance
        const memberRes = await api.addFamilyMember({
          name: memberName.trim(),
          role: memberRole
        });

        await api.saveAllowance({
          family_member_id: memberRes.id,
          amount: parseFloat(amount),
          period,
          notes: notes.trim()
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
    const confirmMsg = language === 'tl'
      ? `Sigurado ka bang nais mong tanggalin si "${al.member_name}" at ang kanyang allowance?`
      : `Are you sure you want to remove "${al.member_name}" and their allowance?`;

    if (!window.confirm(confirmMsg)) return;

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
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans'] flex items-center gap-2.5">
            <span>Family Allowances & Baon</span>
            <span className="text-2xl">👨‍👩‍👧‍👦</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Pamahalaan at i-track ang regular allowances para sa asawa, mga anak, at magulang.
          </p>
        </div>
        
        <button
          onClick={handleOpenAdd}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Family Allowance</span>
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Registered Dependents</span>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-50 mt-1 font-['Plus_Jakarta_Sans']">
            {allowances.length} <span className="text-sm font-medium text-slate-500">family members</span>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Active Schedules</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-['Plus_Jakarta_Sans']">
            {allowances.length} <span className="text-sm font-medium text-slate-500">allowances</span>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Allocated</span>
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
            No family allowances registered yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            Magdagdag ng miyembro ng pamilya o anak para mai-budget ang kanilang daily baon o regular na padala.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
          >
            + Add First Allowance
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {allowances.map((al) => (
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
                        {al.member_role || 'dependent'}
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold capitalize border border-emerald-200 dark:border-emerald-800/80">
                    {al.period}
                  </span>
                </div>

                <div className="my-3">
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Allowance Amount</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
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
                  <span>Edit</span>
                </button>

                <button
                  onClick={() => handleDelete(al)}
                  className="px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unified Add / Edit Allowance Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-1 font-['Plus_Jakarta_Sans']">
              {editingAllowance ? 'Edit Family Allowance ✏️' : 'Add Family Allowance 👨‍👩‍👧'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Itakda ang miyembro ng pamilya, halaga, at frequency ng regular allowance.
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  Name / Nickname
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
                  Role / Relationship
                </label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm font-semibold"
                >
                  <option value="child">Child (Anak / Bunso / Panganay)</option>
                  <option value="spouse">Spouse (Asawa)</option>
                  <option value="parent">Parent (Nanay / Tatay)</option>
                  <option value="sibling">Sibling (Kapatid)</option>
                  <option value="other">Other Dependent</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                    Amount (₱)
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
                    Frequency / Period
                  </label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm font-semibold"
                  >
                    <option value="daily">Daily (Araw-araw / Baon)</option>
                    <option value="weekly">Weekly (Lingguhan)</option>
                    <option value="monthly">Monthly (Buwanan)</option>
                    <option value="per-payday">Per Payday (Kinsenas)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  Notes / Description (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Grade 2 baon for lunch and snacks"
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition cursor-pointer"
                >
                  {editingAllowance ? 'Save Changes' : 'Add Allowance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
