import React, { useEffect, useState, useRef } from 'react';
import { 
  Bot, Send, Trash2, User, Sparkles, Cpu, Zap, 
  ArrowRight, CheckCircle2, Wallet, CalendarDays, Receipt, ShieldCheck, ChevronRight 
} from 'lucide-react';
import * as api from '../services/api';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useLanguageStore } from '../stores/useLanguageStore';

export function AIChatPage({ setActiveTab }) {
  const { dashboardData, loadDashboard } = useBudgetStore();
  const { language, t } = useLanguageStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [aiMode, setAiMode] = useState(localStorage.getItem('budgetph_ai_mode') || 'auto');
  const messagesEndRef = useRef(null);

  const user = dashboardData?.user;
  const metrics = dashboardData?.metrics || {};
  const obligations = dashboardData?.obligations || [];
  const userName = user?.name || 'Ka-Budget';

  const handleModeChange = (mode) => {
    setAiMode(mode);
    localStorage.setItem('budgetph_ai_mode', mode);
  };

  const cleanMessageText = (rawText) => {
    if (!rawText) return '';
    // Strip XML tool calls or internal tags if present
    let cleaned = rawText
      .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
      .replace(/<function=[\s\S]*?<\/function>/gi, '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .trim();
    return cleaned;
  };

  const loadHistory = async () => {
    const res = await api.fetchAIHistory();
    if (res.success && res.history?.length) {
      setMessages(res.history.filter(m => cleanMessageText(m.message).length > 0));
    } else {
      setMessages([
        {
          role: 'assistant',
          message: t('ai_welcome_msg', { name: userName }),
          engine: 'local',
          model: 'BudgetPH Assistant'
        }
      ]);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', message: text }]);
    setIsThinking(true);

    try {
      const res = await api.sendAIMessage(text, language, aiMode);
      if (res.success) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            message: cleanMessageText(res.message) || (language === 'tl' ? 'Nagawa ko na ang iyong request! ✅' : 'Action completed successfully! ✅'),
            engine: res.engine,
            model: res.model,
            action_receipt: res.action_receipt
          }
        ]);

        // If an action was executed, refresh the global dashboard state
        if (res.action_receipt) {
          await loadDashboard();
        }
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          message: language === 'tl'
            ? '⚠️ Pasensya na, nagkaroon ng error sa koneksyon.'
            : '⚠️ Sorry, there was an error connecting to the AI assistant.',
          engine: 'error'
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleClear = async () => {
    if (!confirm(t('clear_history_confirm'))) return;
    await api.clearAIHistory();
    setMessages([
      {
        role: 'assistant',
        message: t('ai_cleared_msg'),
        engine: 'local',
        model: 'BudgetPH Assistant'
      }
    ]);
  };

  const suggestions = [
    language === 'tl' ? 'Pumasok na sahod ko ₱20,000' : 'Received my sahod ₱20,000',
    language === 'tl' ? 'Kumain sa Jollibee ₱250 need' : 'Logged ₱250 lunch, need',
    language === 'tl' ? 'Dumating kuryente ₱2,400 due 20th' : 'Add electricity bill ₱2,400 due 20th',
    language === 'tl' ? 'Nabayaran ko na ang internet ₱800' : 'Paid internet bill ₱800',
    language === 'tl' ? 'Magtabi ng ₱1,000 sa Emergency Fund' : 'Save ₱1,000 to Emergency Fund'
  ];

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50 dark:bg-slate-950/40 relative select-none">
      
      {/* 1. Minimal Ambient Header Ribbon */}
      <div className="h-14 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-3 flex-shrink-0 z-10">
        
        {/* Left: App Title & Model Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <span className="font-extrabold text-sm text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans'] hidden sm:inline">
              BudgetPH Co-Pilot
            </span>
          </div>

          <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl flex items-center border border-slate-200 dark:border-slate-700/60 text-[11px]">
            <button
              type="button"
              onClick={() => handleModeChange('auto')}
              title="Automatic: Uses Groq Cloud LLM with tool calling, falls back to local math engine"
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                aiMode === 'auto'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Auto</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('groq')}
              title="Force Groq Cloud LLM"
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                aiMode === 'groq'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Groq AI</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('local')}
              title="Force Local Math Calculation Engine (Offline)"
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                aiMode === 'local'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3 h-3" />
              <span>Local Math</span>
            </button>
          </div>
        </div>

        {/* Right: Quick Budget Ticker Pills & Clear */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab && setActiveTab('daily')}
            title="Click to open Daily Spending Log"
            className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>₱{Number(metrics.remaining_today || 0).toLocaleString()} {language === 'tl' ? 'Today' : 'Today'}</span>
          </button>

          <button
            onClick={() => setActiveTab && setActiveTab('payday')}
            title="Click to open Payday Simulator"
            className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-blue-50 dark:hover:bg-blue-950/60 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <CalendarDays className="w-3 h-3 text-blue-500" />
            <span>{metrics.days_until_payday || 0}d {language === 'tl' ? 'Sahod' : 'Payday'}</span>
          </button>

          <button
            onClick={() => setActiveTab && setActiveTab('obligations')}
            title="Click to open Bills & Obligations"
            className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-amber-50 dark:hover:bg-amber-950/60 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Receipt className="w-3 h-3 text-amber-500" />
            <span>{obligations.filter(o => !o.is_paid).length} {language === 'tl' ? 'Bills' : 'Bills'}</span>
          </button>

          <button
            onClick={handleClear}
            title="Clear Conversation History"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Full-Height Message Stream (ChatGPT / Gemini Style) */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            const isGroq = m.engine === 'groq';
            const receipt = m.action_receipt;
            const content = cleanMessageText(m.message);

            if (!content && !receipt) return null;

            return (
              <div key={idx} className={`flex items-start gap-3.5 ${isUser ? 'justify-end' : ''}`}>
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-green-600 to-emerald-500 text-white flex items-center justify-center text-xs font-black shadow-md flex-shrink-0 mt-1">
                    AI
                  </div>
                )}

                <div className={`max-w-2xl flex flex-col space-y-2.5 ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Engine Tag */}
                  {!isUser && (
                    <div className="flex items-center gap-1.5">
                      {isGroq ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/70 px-2 py-0.5 rounded-md border border-emerald-300/60 dark:border-emerald-800/60">
                          <Sparkles className="w-2.5 h-2.5 text-emerald-500 animate-pulse" />
                          <span>Groq · {m.model || 'Autonomous AI'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-300/60 dark:border-slate-700">
                          <Cpu className="w-2.5 h-2.5 text-slate-500" />
                          <span>Local Math Engine (Offline)</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Message Bubble */}
                  {content && (
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? 'bg-green-600 text-white rounded-tr-sm shadow-md font-medium'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm shadow-sm'
                    }`}>
                      <div dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }} />
                    </div>
                  )}

                  {/* Rich Interactive Action Receipt Cards */}
                  {receipt && receipt.success && (
                    <div className="w-full animate-in zoom-in-95 duration-200">
                      {/* Payday Cycle Action Card */}
                      {receipt.action_type === 'record_payday' && (
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-green-500/10 border border-emerald-500/30 dark:border-emerald-500/40 text-slate-900 dark:text-slate-100 space-y-2.5 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{language === 'tl' ? 'Sahod Cut-off Na-activate!' : 'Payday Cycle Activated!'}</span>
                            </span>
                            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                              ₱{Number(receipt.data.received_amount).toLocaleString()}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                            <div className="bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-xl border border-emerald-200/50 dark:border-slate-800">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">{t('daily_budget_limit')}</span>
                              <strong className="text-sm">₱{Number(receipt.data.daily_budget).toLocaleString()}/day</strong>
                            </div>
                            <div className="bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-xl border border-emerald-200/50 dark:border-slate-800">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">{t('next_payday_in')}</span>
                              <strong className="text-sm">{receipt.data.next_payday}</strong>
                            </div>
                          </div>
                          <button
                            onClick={() => setActiveTab && setActiveTab('payday')}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <span>{language === 'tl' ? 'Tingnan sa Payday Simulator' : 'View in Payday Simulator'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Log Expense Action Card */}
                      {receipt.action_type === 'log_expense' && (
                        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <span>💸</span>
                              <span>{receipt.data.description}</span>
                              <span className="text-red-600 dark:text-red-400 font-black">-₱{Number(receipt.data.amount).toLocaleString()}</span>
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {language === 'tl' ? 'Natitirang safe spending today:' : 'Remaining safe limit today:'} <strong>₱{Number(receipt.data.remaining_today).toLocaleString()}</strong>
                            </p>
                          </div>
                          <button
                            onClick={() => setActiveTab && setActiveTab('daily')}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-[11px] border border-slate-200 dark:border-slate-700 transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>{t('daily_view')}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Add Obligation / Debt Action Card */}
                      {receipt.action_type === 'add_obligation_or_debt' && (
                        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 dark:border-amber-500/40 text-xs flex items-center justify-between shadow-sm">
                          <div>
                            <p className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                              <span>📋</span>
                              <span>{receipt.data.name}</span>
                              <span>· ₱{Number(receipt.data.amount).toLocaleString()}</span>
                            </p>
                            <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                              {language === 'tl' ? `Due tuwing ika-${receipt.data.due_day} ng buwan` : `Due every ${receipt.data.due_day}th of month`}
                            </p>
                          </div>
                          <button
                            onClick={() => setActiveTab && setActiveTab('obligations')}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>{t('manage_all')}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Mark Bill Paid Action Card */}
                      {receipt.action_type === 'mark_bill_paid' && (
                        <div className="p-3.5 rounded-2xl bg-green-500/10 border border-green-500/30 text-xs flex items-center justify-between shadow-sm">
                          <p className="font-bold text-green-900 dark:text-green-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span>{receipt.data.name} {language === 'tl' ? 'na-markahan na bayad!' : 'marked as paid!'} (₱{Number(receipt.data.amount_paid).toLocaleString()})</span>
                          </p>
                          <button
                            onClick={() => setActiveTab && setActiveTab('obligations')}
                            className="text-green-700 dark:text-green-300 hover:underline font-bold text-[11px]"
                          >
                            {t('obligations')} ➔
                          </button>
                        </div>
                      )}

                      {/* Savings Deposit Action Card */}
                      {receipt.action_type === 'deposit_to_savings' && (
                        <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-xs flex items-center justify-between shadow-sm">
                          <div>
                            <p className="font-bold text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
                              <span>🏦</span>
                              <span>+₱{Number(receipt.data.deposited).toLocaleString()} {language === 'tl' ? 'naidagdag sa' : 'added to'} {receipt.data.name}</span>
                            </p>
                            <p className="text-[10px] text-teal-700/80 dark:text-teal-400/80 mt-0.5">
                              {language === 'tl' ? 'Kabuuang naipon:' : 'Total saved:'} ₱{Number(receipt.data.current_total).toLocaleString()}
                            </p>
                          </div>
                          <button
                            onClick={() => setActiveTab && setActiveTab('savings')}
                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>{t('savings')}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isThinking && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold shadow-sm flex-shrink-0 animate-pulse">
                AI
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 rounded-tl-sm shadow-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                <span>{t('ai_thinking')}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 3. Bottom Docked ChatGPT-Style Prompt Container (Always Visible) */}
      <div className="p-4 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-slate-950 dark:via-slate-950/95 dark:to-transparent z-10 flex-shrink-0">
        <div className="max-w-3xl mx-auto space-y-2">
          
          {/* Quick Action Suggestion Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 select-none">
            <span className="text-[10px] font-bold text-slate-400 uppercase flex-shrink-0">Quick:</span>
            {suggestions.map((pill, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(pill)}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800/80 hover:bg-green-50 dark:hover:bg-green-950/60 hover:border-green-300 dark:hover:border-green-700 text-slate-600 dark:text-slate-300 rounded-full text-[11px] font-semibold whitespace-nowrap border border-slate-200 dark:border-slate-700/60 transition cursor-pointer"
              >
                {pill}
              </button>
            ))}
          </div>

          {/* Floating Prompt Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 rounded-2xl sm:rounded-3xl p-1.5 sm:p-2 shadow-xl focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent transition"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={language === 'tl' ? 'I-chat ang sahod, gastos, utang, o budget question...' : 'Chat your salary, expense, bill, or budget question...'}
              className="flex-1 px-3 sm:px-4 py-2.5 text-sm bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-bold text-sm shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
            >
              <span className="hidden sm:inline">Send</span>
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      </div>

    </div>
  );
}
