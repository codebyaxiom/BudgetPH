import React, { useEffect, useState, useRef } from 'react';
import { Bot, Send, Trash2, User, Sparkles, Cpu, Zap } from 'lucide-react';
import * as api from '../services/api';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useLanguageStore } from '../stores/useLanguageStore';

export function AIChatPage() {
  const { dashboardData } = useBudgetStore();
  const { language, t } = useLanguageStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [aiMode, setAiMode] = useState(localStorage.getItem('budgetph_ai_mode') || 'auto');
  const messagesEndRef = useRef(null);

  const userName = dashboardData?.user?.name || 'Ka-Budget';

  const handleModeChange = (mode) => {
    setAiMode(mode);
    localStorage.setItem('budgetph_ai_mode', mode);
  };

  const loadHistory = async () => {
    const res = await api.fetchAIHistory();
    if (res.success && res.history?.length) {
      setMessages(res.history);
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
            message: res.message,
            engine: res.engine,
            model: res.model
          }
        ]);
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
    t('ai_suggestion_1'),
    t('ai_suggestion_2'),
    t('ai_suggestion_3'),
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-green-600 to-emerald-500 text-white flex items-center justify-center shadow-md text-2xl">
            🤖
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
              {t('ai_header')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              {t('ai_subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Selector Pill */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 flex items-center shadow-sm">
            <button
              type="button"
              onClick={() => handleModeChange('auto')}
              title="Automatic: Uses Groq Cloud LLM when online, falls back to local math engine"
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                aiMode === 'auto'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Auto</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('groq')}
              title="Force Groq Llama 3.3 70B Cloud LLM"
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                aiMode === 'groq'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Groq AI</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('local')}
              title="Force Local Math Calculation Engine (Offline)"
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                aiMode === 'local'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              <Cpu className="w-3 h-3" />
              <span>Local Math</span>
            </button>
          </div>

          <button
            onClick={handleClear}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('clear_history_btn')}</span>
          </button>
        </div>
      </div>

      {/* Chat Conversation Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex flex-col h-[600px] overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/40">
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            const isGroq = m.engine === 'groq';
            const isLocal = m.engine === 'local';

            return (
              <div key={idx} className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}>
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold shadow-sm flex-shrink-0 mt-1">
                    AI
                  </div>
                )}
                <div className="max-w-xl flex flex-col">
                  {/* Engine Identification Tag for Assistant */}
                  {!isUser && (
                    <div className="mb-1 flex items-center gap-1.5">
                      {isGroq ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/70 px-2 py-0.5 rounded-md border border-emerald-300/60 dark:border-emerald-800/60">
                          <Sparkles className="w-2.5 h-2.5 text-emerald-500 animate-pulse" />
                          <span>Groq · {m.model || 'Llama 3.3 70B'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-300/60 dark:border-slate-700">
                          <Cpu className="w-2.5 h-2.5 text-slate-500" />
                          <span>Local Math Engine (Offline)</span>
                        </span>
                      )}
                    </div>
                  )}

                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-green-600 text-white rounded-tr-sm shadow-sm font-medium'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-sm shadow-sm'
                  }`}>
                    <div dangerouslySetInnerHTML={{ __html: m.message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }} />
                  </div>
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
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 rounded-tl-sm shadow-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                <span>{t('ai_thinking')}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="px-6 py-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold text-slate-400 uppercase flex-shrink-0">Suggestions:</span>
          {suggestions.map((pill, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(pill)}
              className="px-3 py-1 bg-green-50 dark:bg-green-950/60 hover:bg-green-100 dark:hover:bg-green-900/60 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold whitespace-nowrap border border-green-200/60 dark:border-green-800/60 transition cursor-pointer"
            >
              {pill}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('ai_placeholder')}
              className="flex-1 px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-5 py-3 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm shadow-md transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <span>{t('save')}</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
