import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, Copy, Check, X, Bug } from 'lucide-react';
import { useFeedbackStore } from '../../stores/useFeedbackStore';
import { useLanguageStore } from '../../stores/useLanguageStore';

export function GlobalFeedbackModal() {
  const { errorModal, closeErrorModal } = useFeedbackStore();
  const { language } = useLanguageStore();
  const isTL = language === 'tl';
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  if (!errorModal) return null;

  const handleCopyDiagnostics = () => {
    const reportText = `[BudgetPH Bug Report]
Title: ${errorModal.title}
Message: ${errorModal.message}
Details: ${errorModal.errorDetails}
Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}`;

    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-rose-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans'] leading-tight">
                {errorModal.title || (isTL ? 'May Naganap na Problema' : 'Something Went Wrong')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isTL ? 'System Notice & Recovery' : 'System Notice & Recovery'}
              </p>
            </div>
          </div>
          <button
            onClick={closeErrorModal}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Body */}
        <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/40 text-xs text-rose-950 dark:text-rose-200 leading-relaxed font-medium">
          {errorModal.message}
        </div>

        {/* Technical Diagnostics (Collapsible) */}
        {errorModal.errorDetails && errorModal.errorDetails !== '""' && (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setShowDetails(prev => !prev)}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <Bug className="w-3 h-3 text-rose-500" />
              <span>{showDetails ? (isTL ? 'Itago ang Technical Details' : 'Hide Technical Details') : (isTL ? 'Ipakita ang Technical Details' : 'Show Technical Details')}</span>
            </button>

            {showDetails && (
              <pre className="p-3 bg-slate-950 text-emerald-400 font-mono text-[10px] rounded-xl overflow-x-auto max-h-32 select-all border border-slate-800">
                {errorModal.errorDetails}
              </pre>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          
          <button
            type="button"
            onClick={handleCopyDiagnostics}
            className="w-full sm:w-auto flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? (isTL ? 'Na-kopya na! 👍' : 'Copied! 👍') : (isTL ? 'Kopyahin ang Error Log' : 'Copy Error Log')}</span>
          </button>

          {errorModal.onRetry ? (
            <button
              type="button"
              onClick={() => {
                closeErrorModal();
                errorModal.onRetry();
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
              <span>{isTL ? 'Subukang Muli 🔄' : 'Try Again 🔄'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={closeErrorModal}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-black shadow-md transition cursor-pointer"
            >
              <span>{isTL ? 'Naiintindihan ko' : 'Dismiss'}</span>
            </button>
          )}

        </div>

      </div>
    </div>
  );
}
