import pool from '../config/db.js';
import { getActivePaydayCycle, getCycleBudgetMetrics } from '../utils/calculator.js';
import { aiToolDefinitions, executeAiTool } from '../utils/aiTools.js';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export async function getUserFinancialSnapshot(userId = 1) {
  const metrics = await getCycleBudgetMetrics(userId);
  const cycle = await getActivePaydayCycle(userId);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // 1. Obligations & Bills
  const [obsList] = await pool.query(
    `SELECT o.id, o.name, o.amount, o.category, o.due_day,
            EXISTS (
              SELECT 1 FROM obligation_payments op
              WHERE op.obligation_id = o.id
                AND MONTH(op.paid_date) = ?
                AND YEAR(op.paid_date) = ?
            ) as is_paid
     FROM obligations o
     WHERE o.user_id = ? AND o.is_active = 1
     ORDER BY o.due_day ASC`,
    [currentMonth, currentYear, userId]
  );

  const unpaidBills = obsList.filter(o => !o.is_paid);
  const paidBills = obsList.filter(o => o.is_paid);
  const totalUnpaidAmount = unpaidBills.reduce((acc, o) => acc + parseFloat(o.amount), 0);
  const totalPaidAmount = paidBills.reduce((acc, o) => acc + parseFloat(o.amount), 0);

  // 2. Savings & Goals
  const [savingsGoals] = await pool.query(
    'SELECT id, name, target_amount, current_amount FROM savings_goals WHERE user_id = ? AND is_active = 1',
    [userId]
  );
  const totalSavings = savingsGoals.reduce((acc, g) => acc + parseFloat(g.current_amount || 0), 0);

  // 3. Family Allowances
  const [allowanceRows] = await pool.query(
    `SELECT a.id, fm.name, fm.role, a.amount, a.period, a.notes
     FROM allowances a
     JOIN family_members fm ON a.family_member_id = fm.id
     WHERE a.user_id = ?`,
    [userId]
  );

  // 4. Wants & Wishlist
  const [wishlistRows] = await pool.query(
    "SELECT id, name, estimated_amount, priority FROM wishlist_items WHERE user_id = ? AND status = 'pending' ORDER BY FIELD(priority, 'high', 'medium', 'low')",
    [userId]
  );
  const totalWishlistCost = wishlistRows.reduce((acc, w) => acc + parseFloat(w.estimated_amount || 0), 0);

  // 5. Today's Logged Expenses Breakdown
  const [todayExpRows] = await pool.query(
    `SELECT id, description, amount, category, mood, expense_date
     FROM expenses
     WHERE user_id = ? AND expense_date = CURRENT_DATE()
     ORDER BY id DESC`,
    [userId]
  );

  // 6. User and Income Profile
  const [userRows] = await pool.query('SELECT name FROM users WHERE id = ?', [userId]);
  const [incomeRows] = await pool.query('SELECT frequency, payday_1, payday_2 FROM income_sources WHERE user_id = ? AND is_active = 1 LIMIT 1', [userId]);

  return {
    user_name: userRows[0]?.name || 'Ka-Budget',
    pay_schedule: incomeRows[0]?.frequency || 'semi_monthly',
    daily_budget: metrics.daily_budget,
    spent_today: metrics.spent_today,
    remaining_today: metrics.remaining_today,
    days_until_payday: metrics.days_until_payday,
    spendable_remaining: metrics.spendable_remaining,
    
    // Obligations Breakdown
    unpaid_bills_count: unpaidBills.length,
    total_unpaid_bills_amount: totalUnpaidAmount,
    unpaid_bills_list: unpaidBills.map(o => `${o.name} (₱${Number(o.amount).toLocaleString()} - due day ${o.due_day})`).join(', ') || 'None! All bills are paid 🎉',
    
    paid_bills_count: paidBills.length,
    total_paid_bills_amount: totalPaidAmount,
    paid_bills_list: paidBills.map(o => `${o.name} (₱${Number(o.amount).toLocaleString()}) [PAID ✅]`).join(', ') || 'None yet',

    all_registered_bills_summary: obsList.map(o => `${o.name} (₱${Number(o.amount).toLocaleString()} [${o.is_paid ? 'PAID ✅' : 'UNPAID ⏳'}])`).join(', '),

    // Savings Goals
    total_savings: totalSavings,
    savings_goals_summary: savingsGoals.map(g => `${g.name}: ₱${Number(g.current_amount).toLocaleString()} / ₱${Number(g.target_amount).toLocaleString()}`).join(', ') || 'No active goals',

    // Family Allowances
    allowances_count: allowanceRows.length,
    allowances_summary: allowanceRows.map(a => `${a.name} (${a.role}): ₱${Number(a.amount).toLocaleString()} / ${a.period}`).join(', ') || 'No family allowances registered',

    // Wants & Wishlist
    pending_wishlist_count: wishlistRows.length,
    total_wishlist_cost: totalWishlistCost,
    wishlist_summary: wishlistRows.map(w => `${w.name} (₱${Number(w.estimated_amount).toLocaleString()} [${w.priority}])`).join(', ') || 'No saved wants yet',
    
    // Today's Expenses Breakdown
    today_expenses_count: todayExpRows.length,
    today_expenses_breakdown: todayExpRows.map(e => `${e.description} (₱${Number(e.amount).toLocaleString()} [${e.category}/${e.mood}])`).join(', ') || 'None yet today',

    cycle_payday_date: cycle?.payday_date,
    cycle_next_payday: cycle?.next_payday_date
  };
}

export async function getProactiveAlerts(req, res) {
  try {
    const userId = 1;
    const lang = req.query.lang || 'en';
    const snapshot = await getUserFinancialSnapshot(userId);
    const alerts = [];

    const isTL = lang === 'tl';

    if (snapshot.remaining_today < 0) {
      alerts.push({
        type: 'danger',
        title: isTL ? '🚨 Over Budget Ngayong Araw' : '🚨 Over Daily Budget Today',
        message: isTL
          ? `Lumampas ka ng ₱${Math.abs(snapshot.remaining_today).toLocaleString()} sa iyong target daily limit.`
          : `You have exceeded your safe daily limit by ₱${Math.abs(snapshot.remaining_today).toLocaleString()}.`
      });
    }

    const currentDay = new Date().getDate();
    const [upcomingObs] = await pool.query(
      `SELECT o.name, o.amount, o.due_day FROM obligations o
       WHERE o.user_id = ? AND o.is_active = 1 
         AND o.id NOT IN (
           SELECT obligation_id FROM obligation_payments 
           WHERE MONTH(paid_date) = MONTH(CURRENT_DATE()) AND YEAR(paid_date) = YEAR(CURRENT_DATE())
         )
         AND o.due_day <= ?
       LIMIT 2`,
      [userId, currentDay + 3]
    );

    for (const ob of upcomingObs) {
      alerts.push({
        type: 'warning',
        title: isTL ? `⚠️ Due Bill: ${ob.name}` : `⚠️ Due Bill: ${ob.name}`,
        message: isTL
          ? `Ang ${ob.name} (₱${Number(ob.amount).toLocaleString()}) ay due sa ika-${ob.due_day} at hindi pa bayad.`
          : `${ob.name} (₱${Number(ob.amount).toLocaleString()}) is due on the ${ob.due_day}th and is still unpaid.`
      });
    }

    res.json({ success: true, alerts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function sendMessage(req, res) {
  try {
    const userId = 1;
    const { message, lang = 'en', mode = 'auto', channel = 'general' } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'Message required' });

    // Save user message with channel
    await pool.query('INSERT INTO ai_conversations (user_id, channel, role, message) VALUES (?, ?, ?, ?)', [userId, channel, 'user', message]);

    let snapshot = await getUserFinancialSnapshot(userId);

    const apiKey = (process.env.GROQ_API_KEY || '').trim();
    let aiResponse = '';
    let usedEngine = 'local';
    let usedModel = 'BudgetPH Math Engine (Local)';
    let actionReceipt = null;

    if (mode !== 'local' && apiKey) {
      const [recentRows] = await pool.query(
        'SELECT role, message FROM ai_conversations WHERE user_id = ? AND channel = ? ORDER BY id DESC LIMIT 8',
        [userId, channel]
      );
      const recentTurns = recentRows.reverse();

      const channelFocusMap = {
        wants: `CURRENT TOPIC CHANNEL: 🛍️ WANTS & WISHLIST DELAY BUFFER
- You are strictly operating as the Wants & Wishlist advisor.
- When the user mentions an item they want to buy, consider buying, or are saving up for, call 'add_to_wishlist'. NEVER call 'log_expense' for items they haven't bought yet!
- When asked what they can afford this sahod, call 'evaluate_wants_affordability'.
- When they confirm they purchased a wishlist item, call 'buy_wishlist_item'.`,
        obligations: `CURRENT TOPIC CHANNEL: ⚡ BILLS & OBLIGATIONS
- You are strictly operating as the Bills & Debt payoff advisor.
- When user asks for UNPAID bills, ONLY list the bills under 'UNPAID Bills' in Live Context below.
- Do NOT list bills marked as 'ALREADY PAID Bills' under unpaid bills.
- When user reports a bill/debt/loan, call 'add_obligation_or_debt'.
- When user reports paying a bill, call 'mark_bill_paid'.`,
        payday: `CURRENT TOPIC CHANNEL: 💰 SAHOD & PAYDAY SIMULATOR
- You are strictly operating as the Payday & Cash Flow advisor.
- When user reports receiving pay/salary, call 'record_payday'.
- When user changes pay frequency (15/30, monthly, weekly), call 'update_income_schedule'.`,
        allowances: `CURRENT TOPIC CHANNEL: 👨‍👩‍👧 FAMILY ALLOWANCES & BAON
- You are strictly operating as the Family Allowance & Baon advisor.
- When adding dependent allowance, call 'add_family_allowance'.`,
        savings: `CURRENT TOPIC CHANNEL: 🏦 SAVINGS & EMERGENCY FUND
- You are strictly operating as the Savings & Goals advisor.
- When depositing money to savings, call 'deposit_to_savings'.`,
        general: `CURRENT TOPIC CHANNEL: 🌟 GENERAL ALL-IN-ONE ADVISOR
- You have access to all tools and assist across all budgeting categories.`
      };

      const channelPrompt = channelFocusMap[channel] || channelFocusMap.general;

      const systemPrompt = `You are BudgetPH, an intelligent, empathetic, and proactive financial co-pilot for Filipino users.
You have direct autonomous tools to manage the user's budget database.

${channelPrompt}

CRITICAL GROUND TRUTH & PRIVACY RULES:
- You are chatting directly with user "${snapshot.user_name}".
- Ground all responses strictly on the Live Financial Context below. The database is the single source of truth.
- NEVER EVER ask the user for their "User ID", "Account ID", or internal database keys. The system handles all authentication automatically in the background.
- When the user mentions paying a bill (e.g. "electricity", "kuryente", "meralco", "wifi", "internet"), IMMEDIATELY call the 'mark_bill_paid' tool.

CRITICAL EXPENSE VS. WISHLIST RULES:
- 'log_expense': ONLY call if the user ALREADY spent money, paid for something, or completed a purchase (e.g. "Kumain sa Jollibee ₱250", "Nagbayad ng pamasahe ₱50", "Binili ko kanina ₱500").
- 'add_to_wishlist': Call whenever the user expresses a DESIRE, WANT, or FUTURE PURCHASE they are considering or holding off on (e.g. "Gusto ko sanang bilhin ang sapatos ₱2,500", "Plano kong bumili ng phone cooler ₱500 pero ipon muna", "May gusto akong bilhin"). NEVER call 'log_expense' if they are just considering or wanting to buy it!
- 'evaluate_wants_affordability': Call when user asks what wants they can afford this cycle or payday (e.g. "Anong wants ang pwede kong bilhin ngayong sahod?").
- 'buy_wishlist_item': Call ONLY when the user explicitly confirms they have now purchased a previously saved wishlist item (e.g. "Binili ko na yung sapatos sa wishlist").

INTERACTIVE CO-PLANNING & INTERVIEW PROTOCOL (Claude / ChatGPT Style):
- When the user asks to plan something (e.g. budgeting for a student/child, debt payoff plan, saving for a goal, or major lifestyle expenses):
  1. DO NOT dump a giant 10-row table or assume all the numbers at once.
  2. Ask ONLY ONE clear, focused question at a time to clarify missing details step-by-step.
  3. ALWAYS append 2 to 4 clickable suggested choices at the very end of your response formatted EXACTLY like:
     <!-- CHOICES: ["Option 1", "Option 2", "Option 3"] -->
     (Example: <!-- CHOICES: ["Nagbabaon (₱50/day)", "Canteen allowance (₱100/day)", "Custom amount"] -->)
     The frontend will automatically render these as interactive clickable buttons.
  4. Once you have all the necessary details over 2-3 short interactive turns, present the final structured budget breakdown and execute the tool ('add_family_allowance', 'add_obligation_or_debt', etc.).

Tool Guidelines:
1. 'record_payday': Call when user reports receiving sahod/salary (e.g. "Pumasok na sahod ko ₱20k").
2. 'update_income_schedule': Call when user changes pay schedule (e.g. from 15/30 to monthly or weekly).
3. 'log_expense': Call when user logs an actual spent expense (e.g. "Lunch ₱250", "Pamasahe ₱50").
4. 'add_obligation_or_debt': Call when user mentions a new bill, debt, utang, or loan.
5. 'mark_bill_paid': Call when user mentions they paid a bill (e.g. "Nabayaran ko na kuryente").
6. 'deposit_to_savings': Call when user puts money into emergency fund or savings.
7. 'add_family_allowance': Call when adding a child or family dependent's regular allowance/baon to the budget.
8. 'add_to_wishlist': Call when user considers buying something non-essential or wants to save an item to their wants/wishlist buffer to review on payday (e.g. "Gusto ko bilhin yung sapatos ₱2,500 pero ipon muna").
9. 'evaluate_wants_affordability': Call when user asks what wants/wishlist items they can afford this payday or cycle (e.g. "Anong wants ang pwede ko nang bilhin ngayong sahod?").
10. 'buy_wishlist_item': Call when user actually buys a saved wishlist item (e.g. "Binili ko na yung sapatos sa wishlist").

Language Guidelines:
- If the user talks or prompts in Tagalog / Taglish, respond naturally in warm Taglish (mix of English & Tagalog).
- If the user talks in English, respond in clear, encouraging, professional English.
- App Default Language: ${lang === 'tl' ? 'Tagalog' : 'English'}.

Live Financial Context:
- User Name: ${snapshot.user_name}
- Pay Frequency: ${snapshot.pay_schedule}
- Safe Daily Budget: ₱${snapshot.daily_budget}
- Remaining Today: ₱${snapshot.remaining_today}
- Spent Today: ₱${snapshot.spent_today} (Breakdown: ${snapshot.today_expenses_breakdown})
- Days until Next Payday: ${snapshot.days_until_payday} days
- Total Cycle Spendable Remaining: ₱${snapshot.spendable_remaining}

BILLS & OBLIGATIONS STATUS:
- UNPAID Bills (${snapshot.unpaid_bills_count} bills, Total: ₱${snapshot.total_unpaid_bills_amount.toLocaleString()}):
  ${snapshot.unpaid_bills_list}
- ALREADY PAID Bills (${snapshot.paid_bills_count} bills, Total: ₱${snapshot.total_paid_bills_amount.toLocaleString()}):
  ${snapshot.paid_bills_list}
- All Registered Bills Status: ${snapshot.all_registered_bills_summary}

FAMILY ALLOWANCES (${snapshot.allowances_count}):
- ${snapshot.allowances_summary}

SAVINGS & EMERGENCY GOALS:
- Total Savings: ₱${Number(snapshot.total_savings).toLocaleString()}
- Goals Breakdown: ${snapshot.savings_goals_summary}

WANTS & WISHLIST BUFFER (${snapshot.pending_wishlist_count} items, Total: ₱${Number(snapshot.total_wishlist_cost).toLocaleString()}):
- ${snapshot.wishlist_summary}

When you execute a tool, warmly confirm the exact details in your response.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...recentTurns.map(t => ({ role: t.role === 'assistant' ? 'assistant' : 'user', content: t.message })),
        { role: 'user', content: message }
      ];

      try {
        const primaryModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
        const modelList = [primaryModel, 'openai/gpt-oss-20b', 'qwen/qwen3.6-27b', 'groq/compound'];
        let successfulModel = '';
        
        for (const mName of modelList) {
          try {
            const groqRes = await axios.post(
              'https://api.groq.com/openai/v1/chat/completions',
              {
                model: mName,
                messages,
                tools: aiToolDefinitions,
                tool_choice: 'auto',
                temperature: 0.5
              },
              {
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json'
                },
                timeout: 25000
              }
            );

            const choice = groqRes.data.choices[0];
            const msgObj = choice.message;

            if (msgObj.tool_calls && msgObj.tool_calls.length > 0) {
              const toolCall = msgObj.tool_calls[0];
              const tName = toolCall.function.name;
              let tArgs = {};
              try {
                tArgs = JSON.parse(toolCall.function.arguments);
              } catch (e) {
                tArgs = {};
              }

              const toolResult = await executeAiTool(tName, tArgs, userId);
              actionReceipt = toolResult;

              // Follow-up completion with tool result
              const followUpMessages = [
                ...messages,
                msgObj,
                {
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  name: tName,
                  content: JSON.stringify(toolResult)
                }
              ];

              const followUpRes = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                  model: mName,
                  messages: followUpMessages,
                  temperature: 0.5
                },
                {
                  headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                  },
                  timeout: 20000
                }
              );

              aiResponse = followUpRes.data.choices[0].message.content;
            } else {
              aiResponse = msgObj.content;
            }

            successfulModel = mName;
            usedEngine = 'groq';
            usedModel = `Groq (${mName})`;
            break;
          } catch (modelErr) {
            console.warn(`Groq model ${mName} failed, falling back...`, modelErr.message);
          }
        }
      } catch (groqErr) {
        console.error('Groq API error in sendMessage:', groqErr.response?.data || groqErr.message);
      }
    }

    if (!aiResponse) {
      usedEngine = 'local';
      usedModel = 'BudgetPH Math Engine (Local)';
      const msg = message.toLowerCase();
      const isTL = msg.includes('pwede') || msg.includes('bilhin') || msg.includes('bumili') || msg.includes('gastos') || msg.includes('magkano') || msg.includes('sahod') || lang === 'tl';

      // Check for local payday command
      if (msg.includes('sahod') || msg.includes('salary') || msg.includes('payday')) {
        const match = msg.match(/\d+[\d,]*/);
        if (match) {
          const amt = parseFloat(match[0].replace(/,/g, ''));
          actionReceipt = await executeAiTool('record_payday', { received_amount: amt }, userId);
          snapshot = await getUserFinancialSnapshot(userId);
          aiResponse = isTL
            ? `🎉 **Na-activate na ang iyong Sahod Cut-off!**\n- **Pumasok na Sahod:** ₱${amt.toLocaleString()}\n- **Safe Daily Spendable:** ₱${snapshot.daily_budget.toLocaleString()} / day\n- **Araw Bago ang Next Payday:** ${snapshot.days_until_payday} araw`
            : `🎉 **Payday Cycle Activated!**\n- **Received Net Pay:** ₱${amt.toLocaleString()}\n- **Safe Daily Spendable:** ₱${snapshot.daily_budget.toLocaleString()} / day\n- **Days Until Next Payday:** ${snapshot.days_until_payday} days`;
        } else {
          aiResponse = isTL
            ? `Congrats sa sahod! 🎉 Magkano ang pumasok na net take-home pay para sa cut-off na ito? (Halimbawa: *"Pumasok na ₱20,000"*).`
            : `Congrats on payday! 🎉 How much net take-home pay did you receive for this cut-off? (e.g. *"Received ₱20,000"*).`;
        }
      } else if (msg.includes('afford') || msg.includes('pwede') || msg.includes('bilhin') || msg.includes('bumili') || msg.includes('buy')) {
        const match = msg.match(/\d+[\d,]*/);
        const amount = match ? parseFloat(match[0].replace(/,/g, '')) : 0;
        if (isTL) {
          if (amount > 0 && amount <= snapshot.remaining_today) {
            aiResponse = `✅ **Oo, kayang-kaya mo ito today!**\n- **Halaga:** ₱${amount.toLocaleString()}\n- **Daily remaining today:** ₱${snapshot.remaining_today.toLocaleString()}\n- **Matitira pa:** ₱${(snapshot.remaining_today - amount).toLocaleString()}\n\nPasok na pasok sa safe daily budget mo!`;
          } else if (amount > snapshot.remaining_today && amount <= snapshot.spendable_remaining) {
            aiResponse = `⚠️ **Kaya sa total cycle budget, pero ma-ooverspend ka for today.**\n- **Halaga:** ₱${amount.toLocaleString()}\n- **Daily remaining:** ₱${snapshot.remaining_today.toLocaleString()}\n- **Cycle spendable:** ₱${snapshot.spendable_remaining.toLocaleString()}\n\nKung bibilhin mo ito ngayon, kailangan magbawas sa mga susunod na araw (${snapshot.days_until_payday} araw bago mag-sahod).`;
          } else {
            aiResponse = `❌ **Hindi advisable bilhin ito ngayon.** Kulang ang natitirang spendable budget (₱${snapshot.spendable_remaining.toLocaleString()}) bago ang next sahod.`;
          }
        } else {
          if (amount > 0 && amount <= snapshot.remaining_today) {
            aiResponse = `✅ **Yes, you can comfortably afford this today!**\n- **Purchase Amount:** ₱${amount.toLocaleString()}\n- **Daily Remaining Today:** ₱${snapshot.remaining_today.toLocaleString()}\n- **Remaining After Purchase:** ₱${(snapshot.remaining_today - amount).toLocaleString()}\n\nThis fits comfortably within your safe daily budget!`;
          } else if (amount > snapshot.remaining_today && amount <= snapshot.spendable_remaining) {
            aiResponse = `⚠️ **Covered by total cycle budget, but exceeds today's daily limit.**\n- **Amount:** ₱${amount.toLocaleString()}\n- **Safe Daily Limit Remaining:** ₱${snapshot.remaining_today.toLocaleString()}\n- **Total Cycle Spendable:** ₱${snapshot.spendable_remaining.toLocaleString()}\n\nIf you make this purchase, you'll need to trim spending over the next ${snapshot.days_until_payday} days.`;
          } else {
            aiResponse = `❌ **Not recommended right now.** Your remaining spendable balance (₱${snapshot.spendable_remaining.toLocaleString()}) cannot cover this amount.`;
          }
        }
      } else {
        if (isTL) {
          aiResponse = `Kumusta! Narito ang quick budget pulse mo:\n- **Safe na pwedeng gastusin today:** ₱${snapshot.remaining_today.toLocaleString()}\n- **Araw bago ang susunod na sahod:** ${snapshot.days_until_payday} araw\n- **Mga parating na bills:** ${snapshot.pending_obligations}\n\nSabihin mo lang kung may bagong sahod, nagastos ka, o may bills na kailangang bayaran!`;
        } else {
          aiResponse = `Hello! Here is your quick budget pulse:\n- **Safe Spendable Today:** ₱${snapshot.remaining_today.toLocaleString()}\n- **Days Until Next Payday:** ${snapshot.days_until_payday} days\n- **Pending Obligations:** ${snapshot.pending_obligations} bills\n\nTell me if you received your sahod, spent on something, or want to record/pay a bill!`;
        }
      }
    }

    // Save assistant response with channel
    await pool.query('INSERT INTO ai_conversations (user_id, channel, role, message) VALUES (?, ?, ?, ?)', [userId, channel, 'assistant', aiResponse]);

    res.json({
      success: true,
      message: aiResponse,
      action_receipt: actionReceipt,
      snapshot,
      engine: usedEngine,
      model: usedModel,
      channel
    });
  } catch (error) {
    console.error('AI chat error in controller:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getConversationHistory(req, res) {
  try {
    const userId = 1;
    const channel = req.query.channel || 'general';
    const [rows] = await pool.query(
      `SELECT role, message, created_at FROM (
         SELECT id, role, message, created_at FROM ai_conversations 
         WHERE user_id = ? AND channel = ? 
         ORDER BY id DESC LIMIT 100
       ) sub ORDER BY id ASC`,
      [userId, channel]
    );
    res.json({ success: true, history: rows, channel });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function clearConversationHistory(req, res) {
  try {
    const userId = 1;
    const channel = req.query.channel;
    if (channel) {
      await pool.query('DELETE FROM ai_conversations WHERE user_id = ? AND channel = ?', [userId, channel]);
    } else {
      await pool.query('DELETE FROM ai_conversations WHERE user_id = ?', [userId]);
    }
    res.json({ success: true, message: 'Chat history cleared', channel: channel || 'all' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function submitFeedback(req, res) {
  try {
    const userId = 1;
    const { channel = 'general', user_message, ai_response, rating, notes = '' } = req.body;
    if (!user_message || !ai_response || !rating) {
      return res.status(400).json({ success: false, error: 'user_message, ai_response, and rating required' });
    }

    const [ins] = await pool.query(
      `INSERT INTO ai_feedback (user_id, channel, user_message, ai_response, rating, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, channel, user_message, ai_response, rating, notes]
    );

    res.json({ success: true, feedback_id: ins.insertId, message: 'Feedback logged for model training' });
  } catch (error) {
    console.error('Error logging AI feedback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function exportTrainingDataset(req, res) {
  try {
    const [feedbackRows] = await pool.query(
      `SELECT channel, user_message, ai_response, rating, notes, created_at 
       FROM ai_feedback 
       WHERE rating = 'positive' 
       ORDER BY id ASC`
    );

    const sftLines = feedbackRows.map(row => ({
      messages: [
        {
          role: 'system',
          content: `You are BudgetPH, an intelligent financial co-pilot tailored for Filipino budgeting routines. Channel: ${row.channel}.`
        },
        { role: 'user', content: row.user_message },
        { role: 'assistant', content: row.ai_response }
      ],
      metadata: {
        channel: row.channel,
        rating: row.rating,
        exported_at: new Date().toISOString()
      }
    }));

    res.setHeader('Content-Disposition', 'attachment; filename=budgetph_training_dataset.json');
    res.setHeader('Content-Type', 'application/json');
    res.json({
      success: true,
      total_records: sftLines.length,
      dataset_format: 'Supervised Fine-Tuning (SFT) / ChatML',
      data: sftLines
    });
  } catch (error) {
    console.error('Error exporting training dataset:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export const getHistory = getConversationHistory;
export const clearHistory = clearConversationHistory;
