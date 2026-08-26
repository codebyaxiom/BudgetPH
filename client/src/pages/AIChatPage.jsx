import React, { useEffect, useState, useRef } from 'react';
import { Bot, Send, Trash2, User, Sparkles } from 'lucide-react';
import * as api from '../services/api';

export function AIChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef(null);

  const loadHistory = async () => {
    const res = await api.fetchAIHistory();
    if (res.success && res.history?.length) {
      setMessages(res.history);
    } else {
      setMessages([
        {
          role: 'assistant',
          message: 'Magandang araw! 👋 Ako ang iyong **BudgetPH AI Advisor**. Handa akong tulungan ka sa iyong pang-araw-araw na gastusin, mga bills, at pagba-budget.'
        }
      ]);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

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
      const res = await api.sendAIMessage(text);
      if (res.success) {
        setMessages(prev => [...prev, { role: 'assistant', message: res.message }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', message: '⚠️ Pasensya na, nagkaroon ng error sa koneksyon.' }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('I-clear ang conversation history?')) return;
    await api.clearAIHistory();
    setMessages([
      {
        role: 'assistant',
        message: 'Nalinis na ang chat history! 🧹 Ano ang maitutulong ko sa iyong budget ngayon?'
      }
    ]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-green-600 to-emerald-500 text-white flex items-center justify-center shadow-md text-2xl">
            🤖
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans']">
              BudgetPH AI Advisor
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Personal Taglish financial assistant.</p>
          </div>
        </div>
        <button
          onClick={handleClear}
          className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear History</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex flex-col h-[600px] overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/40">
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            return (
              <div key={idx} className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}>
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold shadow-sm flex-shrink-0">
                    AI
                  </div>
                )}
                <div className={`p-4 rounded-2xl text-sm leading-relaxed max-w-xl ${
                  isUser
                    ? 'bg-green-600 text-white rounded-tr-sm shadow-sm font-medium'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-sm shadow-sm'
                }`}>
                  <div dangerouslySetInnerHTML={{ __html: m.message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }} />
                </div>
                {isUser && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
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
                <span>Nag-iisip si BudgetPH...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-6 py-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold text-slate-400 uppercase flex-shrink-0">Suggestions:</span>
          {[
            'Pwede ba akong bumili ng ₱300 na kape today?',
            'Ano ang mga bills ko due this week?',
            'Magkano ang natitira kong budget bago mag-sahod?'
          ].map((pill, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(pill)}
              className="px-3 py-1 bg-green-50 dark:bg-green-950/60 hover:bg-green-100 dark:hover:bg-green-900/60 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold whitespace-nowrap border border-green-200/60 dark:border-green-800/60 transition"
            >
              {pill}
            </button>
          ))}
        </div>

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
              placeholder="Magtanong tungkol sa iyong budget, gastusin, o bayarin..."
              className="flex-1 px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-5 py-3 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
