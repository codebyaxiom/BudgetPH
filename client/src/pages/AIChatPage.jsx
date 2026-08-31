import React, { useEffect, useState, useRef } from 'react';
import { 
  Bot, Send, Trash2, User, Sparkles, Cpu, Zap, 
  ArrowRight, CheckCircle2, Wallet, CalendarDays, Receipt, ShieldCheck, ChevronRight,
  Copy, Check, ThumbsUp, ThumbsDown, MessageSquare
} from 'lucide-react';
import * as api from '../services/api';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useLanguageStore } from '../stores/useLanguageStore';
import { parseMarkdown } from '../utils/markdownParser';
import { ConversationalOnboardingCard } from '../components/common/ConversationalOnboardingCard';

const CHANNELS = [
  { id: 'general', icon: '🌟', labelEn: 'All-in-One', labelTl: 'Lahat (General)', color: 'emerald' },
  { id: 'wants', icon: '🛍️', labelEn: 'Wants & Wishlist', labelTl: 'Wants at Wishlist', color: 'rose' },
  { id: 'obligations', icon: '⚡', labelEn: 'Bills & Debts', labelTl: 'Bills at Utang', color: 'amber' },
  { id: 'payday', icon: '💰', labelEn: 'Sahod & Payday', labelTl: 'Sahod at Payday', color: 'blue' },
  { id: 'allowances', icon: '👨‍👩‍👧', labelEn: 'Family Allowances', labelTl: 'Baon at Pamilya', color: 'purple' },
  { id: 'savings', icon: '🏦', labelEn: 'Savings & Goals', labelTl: 'Ipon at Emergency', color: 'teal' },
];

export function AIChatPage({ setActiveTab }) {
  const { dashboardData, loadDashboard } = useBudgetStore();
  const { language, t } = useLanguageStore();
  const isTL = language === 'tl';

  const [activeChannel, setActiveChannel] = useState('general');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [aiMode, setAiMode] = useState(localStorage.getItem('budgetph_ai_mode') || 'auto');
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [feedbackState, setFeedbackState] = useState({}); // { [msgIdx]: 'positive' | 'negative' }
  const [forceShowSetupCard, setForceShowSetupCard] = useState(false);
  const messagesEndRef = useRef(null);

  const user = dashboardData?.user;
  const isProfileIncomplete = !user || Number(user?.profile_completed || 0) === 0 || !dashboardData?.active_cycle;
  const shouldShowSetupCard = isProfileIncomplete || forceShowSetupCard;

  const remainingToday = dashboardData?.remaining_today ?? dashboardData?.metrics?.remaining_today ?? 0;
  const daysUntilPayday = dashboardData?.days_until_payday ?? dashboardData?.metrics?.days_until_payday ?? 0;
  const upcomingBills = dashboardData?.upcoming_bills || dashboardData?.obligations || [];
  const unpaidBillsCount = upcomingBills.filter(o => !o.is_paid).length;
  const userName = user?.name || 'Ka-Budget';

  const handleModeChange = (mode) => {
    setAiMode(mode);
    localStorage.setItem('budgetph_ai_mode', mode);
  };

  const handleCopy = (text, idx) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleFeedback = async (msgIdx, messageObj, rating) => {
    try {
      // Find the previous user message
      let userMsg = '';
      for (let i = msgIdx - 1; i >= 0; i--) {
        if (messages[i]?.role === 'user') {
          userMsg = messages[i].message;
          break;
        }
      }

      setFeedbackState(prev => ({ ...prev, [msgIdx]: rating }));
      await api.submitAIFeedback({
        channel: activeChannel,
        user_message: userMsg || 'Contextual query',
        ai_response: cleanMessageText(messageObj.message),
        rating
      });
    } catch (e) {
      console.error('Feedback submission error:', e);
    }
  };

  const extractChoices = (rawText) => {
    if (!rawText) return [];
    const match = rawText.match(/<!--\s*CHOICES:\s*(\[.*?\])\s*-->/is);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  const cleanMessageText = (rawText) => {
    if (!rawText) return '';
    return rawText
      .replace(/<!--\s*CHOICES:[\s\S]*?-->/gi, '')
      .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
      .replace(/<function=[\s\S]*?<\/function>/gi, '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .trim();
  };

  const getChannelWelcome = (channelId) => {
    switch (channelId) {
      case 'wants':
        return {
          message: isTL
            ? `Kumusta, ${userName}! Dito sa **Wants & Wishlist Delay Buffer**, pwede mong i-lista ang mga gusto mong bilhin para maiwasan ang impulse spending. Sa bawat sahod, susuriin ko kung safe nang bilhin nang hindi nasisira ang iyong daily allowance!\n\n<!-- CHOICES: ["Gusto ko sanang bilhin ang sapatos ₱2,500 pero ipon muna", "Anong wants ang pwede kong bilhin ngayong sahod?", "Plano kong bumili ng mechanical keyboard ₱2,200"] -->`
            : `Hello, ${userName}! Welcome to the **Wants & Wishlist Delay Buffer**. Save non-essential items here to curb impulse buying. On payday, ask me to evaluate which ones you can safely afford!\n\n<!-- CHOICES: ["Add to wishlist: Shoes ₱2,500 (save for later)", "What wants can I afford this payday?", "Considering buying a keyboard ₱2,200"] -->`,
          choices: isTL
            ? ['Gusto ko sanang bilhin ang sapatos ₱2,500 pero ipon muna', 'Anong wants ang pwede kong bilhin ngayong sahod?', 'Plano kong bumili ng mechanical keyboard ₱2,200']
            : ['Add to wishlist: Shoes ₱2,500 (save for later)', 'What wants can I afford this payday?', 'Considering buying a keyboard ₱2,200']
        };
      case 'obligations':
        return {
          message: isTL
            ? `Kumusta, ${userName}! Dito sa **Bills & Obligations Copilot**, tulungan kitang subaybayan ang kuryente, tubig, internet, at mga utang o loans para hindi ma-late sa due date!\n\n<!-- CHOICES: ["Nabayaran ko na ang Meralco ₱2,400", "Dumating ang internet bill ₱1,500 due 25th", "Ilista ang mga parating na bayarin"] -->`
            : `Hello, ${userName}! Welcome to **Bills & Obligations**. I will help track your utilities, credit card balances, and due dates!\n\n<!-- CHOICES: ["Paid electricity bill ₱2,400", "Add wifi bill ₱1,500 due 25th", "Show my upcoming bills"] -->`,
          choices: isTL
            ? ['Nabayaran ko na ang Meralco ₱2,400', 'Dumating ang internet bill ₱1,500 due 25th', 'Ilista ang mga parating na bayarin']
            : ['Paid electricity bill ₱2,400', 'Add wifi bill ₱1,500 due 25th', 'Show my upcoming bills']
        };
      case 'payday':
        return {
          message: isTL
            ? `Kumusta, ${userName}! Dito sa **Sahod & Payday Copilot**, tulungan kitang i-activate ang iyong sahod cut-off at kalkulahin ang iyong bagong daily budget limit.\n\n<!-- CHOICES: ["Pumasok na sahod ko ₱20,000", "Baguhin ang sahod schedule sa monthly", "Kailan ang susunod kong sahod?"] -->`
            : `Hello, ${userName}! Welcome to **Sahod & Payday Simulator**. Let's activate your new salary cycle and compute your safe daily budget.\n\n<!-- CHOICES: ["Received my sahod ₱20,000", "Change pay schedule to monthly", "When is my next payday?"] -->`,
          choices: isTL
            ? ['Pumasok na sahod ko ₱20,000', 'Baguhin ang sahod schedule sa monthly', 'Kailan ang susunod kong sahod?']
            : ['Received my sahod ₱20,000', 'Change pay schedule to monthly', 'When is my next payday?']
        };
      case 'allowances':
        return {
          message: isTL
            ? `Kumusta, ${userName}! Dito sa **Family Allowances Copilot**, i-plano natin ang pang-araw-araw na baon ng mga bata at regular na allowance ng pamilya.\n\n<!-- CHOICES: ["Baon ni Grade 2 (₱100/day)", "Weekly pamasahe ni panganay ₱500", "Ipakita ang lahat ng allowances"] -->`
            : `Hello, ${userName}! Welcome to **Family Allowances & Baon**. Manage daily student lunch money and family dependent allowances here!\n\n<!-- CHOICES: ["Add Grade 2 baon (₱100/day)", "Weekly student transport ₱500", "Show all active allowances"] -->`,
          choices: isTL
            ? ['Baon ni Grade 2 (₱100/day)', 'Weekly pamasahe ni panganay ₱500', 'Ipakita ang lahat ng allowances']
            : ['Add Grade 2 baon (₱100/day)', 'Weekly student transport ₱500', 'Show all active allowances']
        };
      case 'savings':
        return {
          message: isTL
            ? `Kumusta, ${userName}! Dito sa **Savings & Emergency Fund Copilot**, buuin natin ang iyong safety net at ipon para sa mga pangarap!\n\n<!-- CHOICES: ["Magtabi ng ₱1,000 sa Emergency Fund", "Magkano na ang kabuuang ipon ko?", "Mag-set ng bagong savings target"] -->`
            : `Hello, ${userName}! Welcome to **Savings & Goals**. Let's build your Emergency Fund and reach your financial safety goals!\n\n<!-- CHOICES: ["Save ₱1,000 to Emergency Fund", "What is my total savings balance?", "Create a new savings goal"] -->`,
          choices: isTL
            ? ['Magtabi ng ₱1,000 sa Emergency Fund', 'Magkano na ang kabuuang ipon ko?', 'Mag-set ng bagong savings target']
            : ['Save ₱1,000 to Emergency Fund', 'What is my total savings balance?', 'Create a new savings goal']
        };
      default:
        return {
          message: isTL
            ? `Kumusta, ${userName}! Ako ang iyong **All-in-One AI Financial Co-pilot**. Sabihin mo lang ang anumang updates sa sahod, gastusin, o bayarin!\n\n<!-- CHOICES: ["Pumasok na sahod ko ₱20,000", "Kumain sa Jollibee ₱250 need", "Magkano safe spendable ko today?", "Anong bills ang due soon?"] -->`
            : `Hello, ${userName}! I'm your **All-in-One AI Financial Co-pilot**. Tell me anytime you get paid, spend on something, or have upcoming bills!\n\n<!-- CHOICES: ["Received my sahod ₱20,000", "Lunch at Jollibee ₱250 need", "What is my safe spendable today?", "What bills are due soon?"] -->`,
          choices: isTL
            ? ['Pumasok na sahod ko ₱20,000', 'Kumain sa Jollibee ₱250 need', 'Magkano safe spendable ko today?', 'Anong bills ang due soon?']
            : ['Received my sahod ₱20,000', 'Lunch at Jollibee ₱250 need', 'What is my safe spendable today?', 'What bills are due soon?']
        };
    }
  };

  const loadHistory = async (channelId = activeChannel) => {
    try {
      const res = await api.fetchAIHistory(channelId);
      if (res.success && res.history?.length) {
        setMessages(res.history.filter(m => cleanMessageText(m.message).length > 0));
      } else {
        const welcome = getChannelWelcome(channelId);
        setMessages([
          {
            role: 'assistant',
            message: welcome.message,
            engine: 'local',
            model: 'BudgetPH Assistant'
          }
        ]);
      }
    } catch (e) {
      console.error('Error loading history:', e);
    }
  };

  useEffect(() => {
    loadDashboard();
    loadHistory(activeChannel);
  }, [activeChannel, language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleChannelSwitch = (channelId) => {
    if (channelId === activeChannel) return;
    setActiveChannel(channelId);
  };

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', message: text }]);
    setIsThinking(true);

    try {
      const res = await api.sendAIMessage(text, language, aiMode, activeChannel);
      if (res.success) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            message: cleanMessageText(res.message) || (isTL ? 'Nagawa ko na ang iyong request! ✅' : 'Action completed successfully! ✅'),
            engine: res.engine,
            model: res.model,
            action_receipt: res.action_receipt
          }
        ]);

        if (res.action_receipt) {
          await loadDashboard();
        }
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          message: isTL
            ? '⚠️ Pasensya na, nagkaroon ng error sa koneksyon.'
            : '⚠️ Sorry, there was an error connecting to the AI assistant.',
          engine: 'error'
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleOnboardingComplete = async ({ name, salary, dailyBudget, totalBills, nextPayday }) => {
    const celebrationMsg = isTL
      ? `Mabuhay, **${name}**! 🎉 Tagumpay nating nai-setup ang iyong budget blueprint:\n\n• **Sahod kada Cut-off:** ₱${Number(salary).toLocaleString()}\n• **Nakatagang Bills:** ₱${Number(totalBills).toLocaleString()}\n• **Awtomatikong Safe Spendable:** ₱${Number(dailyBudget).toLocaleString()} / araw\n• **Susunod na Sahod:** ${nextPayday}\n\nMay iba ka pa bang gustong idagdag tulad ng utang/loan, family baon, o iba pang gastusin bago tayo pumunta sa Dashboard?\n\n<!-- CHOICES: ["Magdagdag ng Utang / Loan 💳", "Magdagdag ng Family Baon 🎒", "Tingnan ang Dashboard 🚀", "I-simulate ang Payday 💰"] -->`
      : `Welcome, **${name}**! 🎉 Your financial blueprint is ready:\n\n• **Salary per Cut-off:** ₱${Number(salary).toLocaleString()}\n• **Allocated Bills:** ₱${Number(totalBills).toLocaleString()}\n• **Daily Safe Spending Limit:** ₱${Number(dailyBudget).toLocaleString()} / day\n• **Next Payday:** ${nextPayday}\n\nWould you like to add anything else such as outstanding debts/loans or family allowances before heading to your Dashboard?\n\n<!-- CHOICES: ["Add Debt / Loan 💳", "Add Family Allowance 🎒", "View Dashboard 🚀", "Simulate Payday 💰"] -->`;

    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        message: celebrationMsg,
        engine: 'local',
        model: 'BudgetPH Financial Blueprint Engine'
      }
    ]);
    await loadDashboard();
  };

  const handleClear = async () => {
    const activeChObj = CHANNELS.find(c => c.id === activeChannel);
    const chLabel = isTL ? activeChObj?.labelTl : activeChObj?.labelEn;
    const confirmMsg = isTL
      ? `Burahin ang conversation history para sa "${chLabel}"?`
      : `Clear conversation history for "${chLabel}"?`;

    if (!confirm(confirmMsg)) return;

    await api.clearAIHistory(activeChannel);
    const welcome = getChannelWelcome(activeChannel);
    setMessages([
      {
        role: 'assistant',
        message: welcome.message,
        engine: 'local',
        model: 'BudgetPH Assistant'
      }
    ]);
  };

  const welcomeData = getChannelWelcome(activeChannel);

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50 dark:bg-slate-950/40 relative select-text">
      
      {/* 1. Ambient Header Ribbon (Mobile-Optimized) */}
      <div className="h-12 sm:h-14 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-2 flex-shrink-0 z-10 select-none">
        
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-lg sm:text-xl">🤖</span>
            <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-50 font-['Plus_Jakarta_Sans'] hidden md:inline">
              BudgetPH Co-Pilot
            </span>
          </div>

          {/* Engine Selector */}
          <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl flex items-center border border-slate-200 dark:border-slate-700/60 text-[10px] sm:text-[11px] flex-shrink-0">
            <button
              type="button"
              onClick={() => handleModeChange('auto')}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                aiMode === 'auto'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Auto</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('groq')}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                aiMode === 'groq'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Groq</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('local')}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                aiMode === 'local'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3 h-3" />
              <span className="hidden xs:inline">Local</span>
            </button>
          </div>
        </div>

        {/* Right Quick Metrics & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            onClick={() => setForceShowSetupCard(prev => !prev)}
            className={`px-2.5 py-1 sm:px-3 sm:py-1 rounded-xl text-[11px] sm:text-xs font-black shadow-xs transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              isProfileIncomplete
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                : forceShowSetupCard
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>{isProfileIncomplete ? (isTL ? 'I-setup ang Badyet' : 'Setup Budget') : (isTL ? '4-Step Setup' : '4-Step Setup')}</span>
          </button>

          {/* Desktop-only quick metric pills */}
          {!isProfileIncomplete && (
            <button
              onClick={() => setActiveTab && setActiveTab('daily')}
              title="Click to open Daily Spending Log"
              className="hidden md:flex px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-bold transition items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>₱{Number(remainingToday).toLocaleString()} Today</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab && setActiveTab('payday')}
            title="Click to open Payday Simulator"
            className="hidden md:flex px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-blue-50 dark:hover:bg-blue-950/60 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-bold transition items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <CalendarDays className="w-3 h-3 text-blue-500" />
            <span>{daysUntilPayday}d Payday</span>
          </button>

          <button
            onClick={() => setActiveTab && setActiveTab('obligations')}
            title="Click to open Bills & Obligations"
            className="hidden lg:flex px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-amber-50 dark:hover:bg-amber-950/60 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-bold transition items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Receipt className="w-3 h-3 text-amber-500" />
            <span>{unpaidBillsCount} Bills</span>
          </button>

          <button
            onClick={handleClear}
            title={isTL ? 'Burahin ang conversation para sa channel na ito' : 'Clear channel conversation'}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Topic Channel Tabs */}
      <div className="px-3 sm:px-6 py-2 bg-slate-100/60 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto select-none no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 flex-shrink-0">
          Topic:
        </span>
        {CHANNELS.map((ch) => {
          const isActive = ch.id === activeChannel;
          return (
            <button
              key={ch.id}
              onClick={() => handleChannelSwitch(ch.id)}
              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 flex-shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span className="text-xs">{ch.icon}</span>
              <span className="text-[11px] sm:text-xs">{isTL ? ch.labelTl : ch.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 select-text">

        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          const isGroq = m.engine === 'groq';
          const content = cleanMessageText(m.message);
          const choices = extractChoices(m.message);
          const receipt = m.action_receipt;
          const userFeedback = feedbackState[idx];

          return (
            <div
              key={idx}
              className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                isUser ? 'justify-end' : 'justify-start'
              }`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-green-600 to-emerald-500 text-white flex items-center justify-center text-xs font-black shadow-md flex-shrink-0 mt-1 select-none">
                  AI
                </div>
              )}

              <div className={`max-w-2xl flex flex-col space-y-2.5 ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Engine Tag */}
                {!isUser && (
                  <div className="flex items-center gap-1.5 select-none">
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

                {/* Message Bubble with Hover Tools (Copy + 👍 / 👎 Feedback) */}
                {content && (
                  <div className="relative group/bubble flex items-start gap-1 max-w-full">
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed select-text cursor-text select-auto ${
                      isUser
                        ? 'bg-green-600 text-white rounded-tr-sm shadow-md font-medium'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm shadow-sm'
                    }`}>
                      <div dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }} />
                    </div>

                    <div className="flex flex-col gap-1 opacity-0 group-hover/bubble:opacity-100 transition flex-shrink-0 select-none mt-1">
                      <button
                        onClick={() => handleCopy(content, idx)}
                        title="Copy text"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        {copiedIdx === idx ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                        {!isUser && (
                          <>
                            <button
                              onClick={() => handleFeedback(idx, m, 'positive')}
                              title="Good response (Help train model)"
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                userFeedback === 'positive'
                                  ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60'
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                              }`}
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleFeedback(idx, m, 'negative')}
                              title="Needs improvement"
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                userFeedback === 'negative'
                                  ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/60'
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                              }`}
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Feedback Confirmation Pill */}
                  {userFeedback && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 select-none">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{isTL ? 'Salamat sa feedback! Na-save para sa AI training.' : 'Thanks for feedback! Saved for model training.'}</span>
                    </span>
                  )}

                  {/* Interactive Choices (Claude / ChatGPT style co-planning pills) */}
                  {choices.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {choices.map((choice, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => {
                            if (choice.includes('Dashboard')) {
                              setActiveTab && setActiveTab('dashboard');
                              return;
                            }
                            if (choice.includes('Payday') || choice.includes('Sahod')) {
                              setActiveTab && setActiveTab('payday');
                              return;
                            }
                            if (choice.includes('Utang') || choice.includes('Loan') || choice.includes('Debt')) {
                              setActiveTab && setActiveTab('obligations');
                              return;
                            }
                            if (choice.includes('Baon') || choice.includes('Allowance')) {
                              setActiveTab && setActiveTab('allowances');
                              return;
                            }
                            if (choice.includes('Savings') || choice.includes('Ipon')) {
                              setActiveTab && setActiveTab('savings');
                              return;
                            }
                            handleSend(choice);
                          }}
                          className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 border border-emerald-300/80 dark:border-emerald-700/80 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-95 cursor-pointer text-left"
                        >
                          <span className="text-emerald-600 dark:text-emerald-400">👉</span>
                          <span>{choice}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Action Receipt Cards */}
                  {receipt && (
                    <div className="w-full space-y-2 pt-1 select-none">
                      
                      {/* Family Allowance Action Card */}
                      {receipt.action_type === 'add_family_allowance' && (
                        <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-xs flex items-center justify-between shadow-sm">
                          <div>
                            <p className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                              <span>🎒</span>
                              <span>{receipt.data.name} Allowance: ₱{Number(receipt.data.amount).toLocaleString()} / {receipt.data.period}</span>
                            </p>
                            <p className="text-[10px] text-purple-700/80 dark:text-purple-400/80 mt-0.5">
                              {receipt.data.notes || (isTL ? 'Naidagdag sa family allowances' : 'Added to family allowances')}
                            </p>
                          </div>
                          <button
                            onClick={() => setActiveTab && setActiveTab('allowances')}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isTL ? 'Tingnan' : 'View'}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Payday Cycle Action Card */}
                      {receipt.action_type === 'record_payday' && (
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-green-500/10 border border-emerald-500/30 dark:border-emerald-500/40 text-slate-900 dark:text-slate-100 space-y-2.5 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{isTL ? 'Sahod Cut-off Na-activate!' : 'Payday Cycle Activated!'}</span>
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
                            <span>{isTL ? 'Tingnan sa Payday Simulator' : 'View in Payday Simulator'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Log Expense Action Card */}
                      {receipt.action_type === 'log_expense' && (
                        <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between shadow-sm">
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">
                              💸 {receipt.data.description} (₱{Number(receipt.data.amount).toLocaleString()})
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {isTL ? 'Natitirang budget today:' : 'Remaining safe today:'} ₱{Number(receipt.data.remaining_today).toLocaleString()}
                            </p>
                          </div>
                          <button
                            onClick={() => setActiveTab && setActiveTab('daily')}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>{t('daily')}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Add Obligation / Bill / Installment Debt Action Card */}
                      {receipt.action_type === 'add_obligation_or_debt' && (
                        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-center justify-between shadow-sm">
                          <div>
                            <p className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                              <span>📋</span>
                              <span>{receipt.data.name} (₱{Number(receipt.data.amount).toLocaleString()}{receipt.data.is_installment ? (isTL ? '/buwan' : '/mo') : ''})</span>
                            </p>
                            <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                              {receipt.data.is_installment 
                                ? (isTL ? `Hulugan hanggang Buwan ${receipt.data.end_month}/${receipt.data.end_year || 2026} · Due tuwing ika-${receipt.data.due_day}` : `Installment until Month ${receipt.data.end_month}/${receipt.data.end_year || 2026} · Due every ${receipt.data.due_day}th`)
                                : `${isTL ? 'Due tuwing ika-' : 'Due every '}${receipt.data.due_day}th`}
                            </p>
                          </div>
                          <button
                            onClick={() => setActiveTab && setActiveTab('obligations')}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>{t('obligations')}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Mark Bill Paid / Advance Payment Action Card */}
                      {receipt.action_type === 'mark_bill_paid' && (
                        <div className="p-3.5 rounded-2xl bg-green-500/10 border border-green-500/30 text-xs flex items-center justify-between shadow-sm">
                          <div>
                            <p className="font-bold text-green-900 dark:text-green-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              <span>
                                {receipt.data.is_completed 
                                  ? (isTL ? `🎉 ${receipt.data.name} Fully Settled!` : `🎉 ${receipt.data.name} Fully Paid!`)
                                  : `${receipt.data.name} (₱${Number(receipt.data.amount_paid).toLocaleString()})`}
                              </span>
                            </p>
                            <p className="text-[10px] text-green-700/80 dark:text-green-400/80 mt-0.5">
                              {receipt.data.months_covered > 1 
                                ? (isTL ? `Advance payment (${receipt.data.months_covered} buwan)! Bagong target end: Buwan ${receipt.data.new_end_month}/${receipt.data.new_end_year}` : `Advance payment (${receipt.data.months_covered} months)! New target end: Month ${receipt.data.new_end_month}/${receipt.data.new_end_year}`)
                                : (isTL ? 'Na-markahan na bayad para sa kasalukuyang cut-off!' : 'Marked as paid for the current cycle!')}
                            </p>
                          </div>
                          <button
                            onClick={() => setActiveTab && setActiveTab('obligations')}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>{t('obligations')}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Savings Deposit Action Card */}
                      {receipt.action_type === 'deposit_to_savings' && (
                        <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-xs flex items-center justify-between shadow-sm">
                          <div>
                            <p className="font-bold text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
                              <span>🏦</span>
                              <span>+₱{Number(receipt.data.deposited).toLocaleString()} {isTL ? 'naidagdag sa' : 'added to'} {receipt.data.name}</span>
                            </p>
                            <p className="text-[10px] text-teal-700/80 dark:text-teal-400/80 mt-0.5">
                              {isTL ? 'Kabuuang naipon:' : 'Total saved:'} ₱{Number(receipt.data.current_total).toLocaleString()}
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

                      {/* Add to Wishlist Action Card */}
                      {receipt.action_type === 'add_to_wishlist' && (
                        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs flex items-center justify-between shadow-sm">
                          <div>
                            <p className="font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                              <span>🛍️</span>
                              <span>{receipt.data.name} (₱{Number(receipt.data.estimated_amount).toLocaleString()})</span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-200/80 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                                {receipt.data.priority}
                              </span>
                            </p>
                            <p className="text-[10px] text-rose-700/80 dark:text-rose-400/80 mt-0.5">
                              {isTL ? 'Nai-save sa Wants Delay Buffer para ma-review sa susunod na sahod!' : 'Saved to Wants Delay Buffer to review on payday!'}
                            </p>
                          </div>
                          <button
                            onClick={() => setActiveTab && setActiveTab('wishlist')}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isTL ? 'Wishlist' : 'Wishlist'}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Evaluate Wants Affordability Action Card */}
                      {receipt.action_type === 'evaluate_wants_affordability' && (
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-emerald-500/10 border border-amber-500/30 dark:border-amber-500/40 text-xs space-y-2.5 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-amber-500" />
                              <span>{isTL ? 'Pagsusuri sa Wants Ngayong Sahod' : 'Payday Wants Evaluation'}</span>
                            </span>
                            <span className="text-[11px] font-bold text-slate-500">
                              ₱{Number(receipt.data.spendable_remaining).toLocaleString()} buffer
                            </span>
                          </div>

                          {receipt.data.affordable_items?.length > 0 ? (
                            <div className="space-y-1.5">
                              <p className="font-bold text-emerald-700 dark:text-emerald-400 text-[11px]">
                                ✅ {isTL ? 'Kayang-kaya bilhin ngayon:' : 'Affordable this cut-off:'}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {receipt.data.affordable_items.map((item, iIdx) => (
                                  <span key={iIdx} className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-300 rounded-xl text-[11px] font-bold">
                                    {item.name} (₱{Number(item.estimated_amount).toLocaleString()})
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-amber-700 dark:text-amber-400 text-[11px]">
                              ⏳ {isTL ? 'Medyo masikip pa ang buffer para sa wants ngayong cut-off. Ipon muna!' : 'Buffer is tight this cut-off. Better to wait for next payday!'}
                            </p>
                          )}

                          <button
                            onClick={() => setActiveTab && setActiveTab('wishlist')}
                            className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>{isTL ? 'Buksan ang Wants & Wishlist' : 'Open Wants & Wishlist'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Buy Wishlist Item Action Card */}
                      {receipt.action_type === 'buy_wishlist_item' && (
                        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex items-center justify-between shadow-sm">
                          <p className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>{receipt.data.name} (₱{Number(receipt.data.amount).toLocaleString()}) {isTL ? 'nabili at na-log na sa gastos!' : 'purchased & logged as expense!'}</span>
                          </p>
                          <button
                            onClick={() => setActiveTab && setActiveTab('daily')}
                            className="text-emerald-700 dark:text-emerald-300 hover:underline font-bold text-[11px]"
                          >
                            {isTL ? 'Daily Log ➔' : 'Daily Log ➔'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-black shadow-sm flex-shrink-0 mt-1 select-none">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Embedded Fast-Track Onboarding Card rendered below AI greeting */}
          {shouldShowSetupCard && (
            <div className="pt-2 animate-in fade-in duration-200">
              <ConversationalOnboardingCard 
                onComplete={(data) => {
                  setForceShowSetupCard(false);
                  handleOnboardingComplete(data);
                }} 
                setActiveTab={setActiveTab} 
              />
            </div>
          )}

          {isThinking && (
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-green-600 to-emerald-500 text-white flex items-center justify-center text-xs font-black shadow-md flex-shrink-0 mt-1 select-none animate-pulse">
                AI
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-tl-sm shadow-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]"></span>
                <span className="text-xs font-bold text-slate-400 ml-2">
                  {isTL ? 'Kino-compute ang datos...' : 'Analyzing budget data...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

      {/* 4. Quick Suggestion Chips (Contextual per active channel) */}
      <div className="px-4 py-2 bg-white/40 dark:bg-slate-900/40 border-t border-slate-200/60 dark:border-slate-800/40 flex items-center gap-2 overflow-x-auto select-none flex-shrink-0">
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 flex-shrink-0">
          <Sparkles className="w-3 h-3 text-emerald-500" />
          <span>{isTL ? 'Mungkahi:' : 'Suggestions:'}</span>
        </span>
        {welcomeData.choices.map((sug, sIdx) => (
          <button
            key={sIdx}
            type="button"
            onClick={() => handleSend(sug)}
            className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 rounded-xl text-[11px] font-medium text-slate-700 dark:text-slate-300 transition whitespace-nowrap cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-95"
          >
            {sug}
          </button>
        ))}
      </div>

      {/* 5. Fixed Bottom-Docked Prompt Input Bar */}
      <div className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800/80 flex-shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="max-w-3xl mx-auto flex items-center gap-2"
        >
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                activeChannel === 'wants'
                  ? (isTL ? 'I-chat ang gustong bilhin (hal: Sapatos ₱2,500 pero ipon muna)...' : 'Type a want or wishlist item (e.g. Shoes ₱2,500)...')
                  : activeChannel === 'obligations'
                    ? (isTL ? 'I-chat ang bagong bill o bayarin (hal: Nabayaran ko na Meralco ₱2,400)...' : 'Type a bill or payment (e.g. Paid Meralco ₱2,400)...')
                    : (isTL ? 'Mag-chat sa AI Copilot (hal: Pumasok na sahod ko ₱20k, Lunch ₱250)...' : 'Message your AI Co-Pilot (e.g. Received pay ₱20k, Lunch ₱250)...')
              }
              className="w-full pl-4 pr-10 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-inner text-slate-900 dark:text-slate-100 placeholder:text-slate-400 font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || isThinking}
            className="p-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-2xl shadow-md transition flex items-center justify-center cursor-pointer flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
}
