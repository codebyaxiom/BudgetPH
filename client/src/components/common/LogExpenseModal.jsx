import React, { useState } from 'react';
import { X, DollarSign, CheckCircle } from 'lucide-react';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useLanguageStore } from '../../stores/useLanguageStore';

export function LogExpenseModal() {
  const { isExpenseModalOpen, closeExpenseModal, logQuickExpense } = useBudgetStore();
  const { language, t } = useLanguageStore();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [mood, setMood] = useState('need');
  const [familyMemberId, setFamilyMemberId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isExpenseModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description || !amount) return;

    setIsSubmitting(true);
    try {
      await logQuickExpense({
        description,
        amount: parseFloat(amount),
        category,
        mood,
        family_member_id: familyMemberId ? parseInt(familyMemberId) : null,
        expense_date: new Date().toISOString().split('T')[0]
      });
      setDescription('');
      setAmount('');
      closeExpenseModal();
    } catch (err) {
      alert('Error logging expense: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
                {t('log_expense')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'tl' ? 'I-record ang pang-araw-araw na bayarin' : 'Record daily transaction or purchase'}
              </p>
            </div>
          </div>
          <button onClick={closeExpenseModal} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              {t('description_label')}
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('description_placeholder')}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                {t('amount_label')}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500 font-bold text-base"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                {t('category_label')}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              >
                <option value="food">🍲 {language === 'tl' ? 'Pagkain' : 'Food & Dining'}</option>
                <option value="transport">🚗 {language === 'tl' ? 'Pamasahe / Grab' : 'Transportation'}</option>
                <option value="groceries">🛒 {language === 'tl' ? 'Palengke / Grocery' : 'Groceries'}</option>
                <option value="utilities">💡 {language === 'tl' ? 'Utilities / Load' : 'Utilities & Bills'}</option>
                <option value="medical">💊 {language === 'tl' ? 'Gamot / Health' : 'Health & Medicine'}</option>
                <option value="entertainment">🎮 {language === 'tl' ? 'Luho / Leisure' : 'Leisure & Wants'}</option>
                <option value="other">📦 {language === 'tl' ? 'Iba pa' : 'Other'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              {t('mood_label')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'need', label: '✅ Need', color: 'border-green-500 bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300' },
                { id: 'want', label: '🛍️ Want', color: 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300' },
                { id: 'regret', label: '😬 Regret', color: 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300' },
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setMood(m.id)}
                  className={`p-2 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                    mood === m.id ? `${m.color} ring-2 ring-offset-1 ring-slate-400 dark:ring-slate-600` : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={closeExpenseModal}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? t('loading') : t('save_expense_btn')}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
