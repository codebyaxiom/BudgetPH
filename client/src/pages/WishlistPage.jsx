import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Plus, CheckCircle2, Trash2, ArrowRight, 
  Sparkles, AlertCircle, ShieldCheck, Flame, Tag 
} from 'lucide-react';
import * as api from '../services/api';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useLanguageStore } from '../stores/useLanguageStore';

export function WishlistPage() {
  const { dashboardData, loadDashboard } = useBudgetStore();
  const { language } = useLanguageStore();
  const isTL = language === 'tl';

  const [wishlistData, setWishlistData] = useState({ items: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filter, setFilter] = useState('pending'); // 'all', 'pending', 'purchased'

  const [formData, setFormData] = useState({
    name: '',
    estimated_amount: '',
    priority: 'medium',
    notes: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.fetchWishlist();
      if (res.success) {
        setWishlistData(res);
      }
    } catch (e) {
      console.error('Error fetching wishlist:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.estimated_amount) return;

    try {
      await api.addWishlistItem(formData);
      setFormData({ name: '', estimated_amount: '', priority: 'medium', notes: '' });
      setIsAddOpen(false);
      await loadData();
      await loadDashboard();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleBuy = async (item) => {
    const confirmMsg = isTL
      ? `Sigurado ka bang bibilhin mo na ang "${item.name}" (₱${Number(item.estimated_amount).toLocaleString()})? I-aawas ito sa iyong cycle budget.`
      : `Are you ready to purchase "${item.name}" (₱${Number(item.estimated_amount).toLocaleString()})? This will be logged as an expense.`;

    if (!confirm(confirmMsg)) return;

    try {
      await api.buyWishlistItem(item.id, true);
      await loadData();
      await loadDashboard();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(isTL ? 'Alisin ang item na ito sa wishlist?' : 'Delete this item from wishlist?')) return;
    try {
      await api.deleteWishlistItem(id);
      await loadData();
    } catch (e) {
      alert(e.message);
    }
  };

  const items = wishlistData.items || [];
  const filteredItems = items.filter(item => {
    if (filter === 'pending') return item.status === 'pending';
    if (filter === 'purchased') return item.status === 'purchased';
    return true;
  });

  const metrics = dashboardData?.metrics || {};
  const spendableRemaining = metrics.spendable_remaining || 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-md text-2xl">
            🛍️
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
              {isTL ? 'Wants & Wishlist Buffer' : 'Wants & Wishlist Buffer'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              {isTL 
                ? 'I-record ang mga gusto mong bilhin. Tutulungan ka ng AI kung kaya na ngayong sahod o ipon muna!' 
                : 'Save non-essential wants here. The AI will evaluate what you can afford each payday!'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isTL ? 'Magdagdag ng Want' : 'Add Want / Wishlist'}</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">{isTL ? 'Kasalukuyang Spendable Buffer' : 'Cycle Spendable Buffer'}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-50">
            ₱{Number(spendableRemaining).toLocaleString()}
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
            {isTL ? 'Pwedeng gamitin para sa wants pagkatapos ng bills' : 'Available for wants after bills & obligations'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">{isTL ? 'Kabuuang Pending Wants' : 'Total Pending Wants'}</span>
            <ShoppingBag className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-50">
            ₱{Number(wishlistData.summary?.total_pending_cost || 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {wishlistData.summary?.pending_count || 0} {isTL ? 'mga nakalistang bibilhin' : 'items on your wishlist'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">{isTL ? 'AI Payday Advice' : 'AI Payday Rule'}</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
            {isTL ? '48-Hour Delay Buffer' : '48-Hour Delay Buffer'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {isTL 
              ? 'Ipalipas muna ang 48 oras bago bilhin ang wants para maiwasan ang impulse buying!' 
              : 'Wait 48 hours before purchasing to curb impulse buys and protect your daily budget.'}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            filter === 'pending'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {isTL ? 'Pending Wants' : 'Pending Wants'} ({items.filter(i => i.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('purchased')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            filter === 'purchased'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {isTL ? 'Nabiling Wants' : 'Purchased'} ({items.filter(i => i.status === 'purchased').length})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            filter === 'all'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {isTL ? 'Lahat' : 'All'} ({items.length})
        </button>
      </div>

      {/* Wishlist Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">{isTL ? 'Kinakarga...' : 'Loading wishlist...'}</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <span className="text-4xl block">✨</span>
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
            {isTL ? 'Walang nakalistang wants sa kasalukuyan' : 'No wishlist items found'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {isTL 
              ? 'Kapag may gusto kang bilhin pero masikip pa ang budget, i-chat mo lang sa AI o i-add dito para ma-plano natin sa susunod na sahod!' 
              : 'Whenever you want to buy something non-essential, add it here or tell the AI to save it for payday evaluation!'}
          </p>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isTL ? 'Magdagdag ng Want' : 'Add First Want'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => {
            const isPurchased = item.status === 'purchased';
            const isAffordable = item.is_affordable_in_cycle;
            const priorityColor = item.priority === 'high' 
              ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800' 
              : item.priority === 'medium'
                ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800'
                : 'text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';

            return (
              <div 
                key={item.id}
                className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm flex flex-col justify-between transition hover:shadow-md ${
                  isPurchased 
                    ? 'border-slate-200 dark:border-slate-800 opacity-70' 
                    : isAffordable
                      ? 'border-emerald-300 dark:border-emerald-800/80 ring-1 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${priorityColor}`}>
                        {item.priority === 'high' ? '🔥 High Priority' : item.priority === 'medium' ? '⚡ Medium' : '🌱 Low'}
                      </span>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 mt-2 font-['Plus_Jakarta_Sans']">
                        {item.name}
                      </h3>
                    </div>
                    <button
                      onClick={() => handleDelete(item.id)}
                      title="Delete want"
                      className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xl font-black text-slate-900 dark:text-slate-50">
                      ₱{Number(item.estimated_amount).toLocaleString()}
                    </p>
                    {item.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {item.notes}
                      </p>
                    )}
                  </div>

                  {!isPurchased && (
                    <div className="pt-2">
                      {isAffordable ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/70 px-2.5 py-1 rounded-xl border border-emerald-300/60 dark:border-emerald-800/60">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isTL ? 'Kayang-kaya bilhin ngayong sahod!' : 'Affordable this payday!'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/70 px-2.5 py-1 rounded-xl border border-amber-300/60 dark:border-amber-800/60">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{isTL ? 'Medyo masikip pa, ipon muna' : 'Tight budget, save for next cycle'}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {isPurchased && (
                    <div className="pt-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-purple-700 dark:text-purple-400 bg-purple-100/70 dark:bg-purple-950/70 px-2.5 py-1 rounded-xl">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isTL ? 'Nabili na ✅' : 'Purchased & Logged ✅'}</span>
                      </span>
                    </div>
                  )}
                </div>

                {!isPurchased && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-4">
                    <button
                      onClick={() => handleBuy(item)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{isTL ? 'Bibilhin Ko Na (I-log sa Gastos)' : 'Buy Now (Log as Expense)'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-lg text-slate-900 dark:text-slate-100 font-['Plus_Jakarta_Sans']">
                {isTL ? 'Magdagdag ng Want / Wishlist' : 'Add Want / Wishlist Item'}
              </h2>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isTL ? 'Pangalan ng Item / Gusto Bilhin' : 'Item Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isTL ? 'Hal. Nike Running Shoes, Mechanical Keyboard' : 'e.g. Nike Shoes, Bluetooth Speaker'}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTL ? 'Tinatayang Halaga (₱)' : 'Estimated Price (₱)'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="2500"
                    value={formData.estimated_amount}
                    onChange={(e) => setFormData({ ...formData, estimated_amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isTL ? 'Priority' : 'Priority'}
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="high">{isTL ? '🔥 High Priority' : '🔥 High Priority'}</option>
                    <option value="medium">{isTL ? '⚡ Medium Priority' : '⚡ Medium Priority'}</option>
                    <option value="low">{isTL ? '🌱 Low Priority / Someday' : '🌱 Low Priority / Someday'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isTL ? 'Notes / Bakit gusto mo ito?' : 'Notes / Motivation'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isTL ? 'Para sa workout tuwing umaga...' : 'Motivation, color, specs, link...'}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-700 font-bold cursor-pointer"
                >
                  {isTL ? 'Kanselahin' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm transition cursor-pointer"
                >
                  {isTL ? 'I-save sa Wishlist' : 'Save to Wishlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
