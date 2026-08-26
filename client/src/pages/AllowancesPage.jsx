import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import * as api from '../services/api';
import { useBudgetStore } from '../stores/useBudgetStore';

export function AllowancesPage() {
  const { loadDashboard } = useBudgetStore();
  const [data, setData] = useState(null);
  const [isMemberModal, setIsMemberModal] = useState(false);
  const [isAllowanceModal, setIsAllowanceModal] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('child');
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState('');

  const loadData = async () => {
    const res = await api.fetchAllowances();
    if (res.success) setData(res);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddMember = async (e) => {
    e.preventDefault();
    await api.addFamilyMember({ name, role });
    setName('');
    setIsMemberModal(false);
    await loadData();
  };

  const handleSaveAllowance = async (e) => {
    e.preventDefault();
    await api.saveAllowance({
      family_member_id: parseInt(memberId),
      amount: parseFloat(amount),
      period: 'per-payday'
    });
    setAmount('');
    setIsAllowanceModal(false);
    await loadData();
    await loadDashboard();
  };

  const allowances = data?.allowances || [];
  const members = data?.familyMembers || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
            Family Allowances 👨‍👩‍👧‍👦
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Pamahalaan ang regular allowances para sa asawa, mga anak, at magulang.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsMemberModal(true)}
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            + Add Member
          </button>
          <button
            onClick={() => setIsAllowanceModal(true)}
            className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-xl shadow-md hover:bg-green-700 transition"
          >
            Assign Allowance
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allowances.map(al => (
          <div key={al.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-300 font-bold flex items-center justify-center">
                  {al.member_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{al.member_name}</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{al.member_role}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 rounded-full text-xs font-bold capitalize border border-green-200 dark:border-green-800">
                {al.period}
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-50 mt-2">₱{Number(al.amount).toLocaleString()}</p>
          </div>
        ))}
      </div>

      {isMemberModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4 font-['Plus_Jakarta_Sans']">Add Family Member</h3>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maria, Joshua"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm"
                >
                  <option value="spouse">Spouse (Asawa)</option>
                  <option value="child">Child (Anak)</option>
                  <option value="parent">Parent (Magulang)</option>
                  <option value="sibling">Sibling (Kapatid)</option>
                  <option value="other">Other Dependent</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMemberModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-xs font-bold text-white bg-green-600 rounded-xl">
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAllowanceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4 font-['Plus_Jakarta_Sans']">Assign Allowance</h3>
            <form onSubmit={handleSaveAllowance} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Family Member</label>
                <select
                  required
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm"
                >
                  <option value="">-- Select Member --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Amount (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 font-bold text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAllowanceModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-xs font-bold text-white bg-green-600 rounded-xl">
                  Save Allowance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
