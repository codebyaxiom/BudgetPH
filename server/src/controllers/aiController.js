import pool from '../config/db.js';
import { getActivePaydayCycle, getCycleBudgetMetrics } from '../utils/calculator.js';
import { aiToolDefinitions, executeAiTool } from '../utils/aiTools.js';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export async function getUserFinancialSnapshot(userId = 1) {
  const metrics = await getCycleBudgetMetrics(userId);
  const cycle = await getActivePaydayCycle(userId);

  const [obligations] = await pool.query(
    'SELECT COUNT(*) as total, SUM(amount) as sum_amount FROM obligations WHERE user_id = ? AND is_active = 1',
    [userId]
  );
  const [obsList] = await pool.query(
    'SELECT name, amount, category, due_day FROM obligations WHERE user_id = ? AND is_active = 1',
    [userId]
  );
  const [savings] = await pool.query(
    'SELECT SUM(current_amount) as total_savings FROM savings_goals WHERE user_id = ? AND is_active = 1',
    [userId]
  );
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
    pending_obligations: obligations[0]?.total || 0,
    total_obligations_amount: obligations[0]?.sum_amount || 0,
    active_bills_summary: obsList.map(o => `${o.name} (₱${Number(o.amount).toLocaleString()})`).join(', ') || 'None yet',
    total_savings: savings[0]?.total_savings || 0,
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
    const { message, lang = 'en', mode = 'auto' } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'Message required' });

    // Save user message
    await pool.query('INSERT INTO ai_conversations (user_id, role, message) VALUES (?, ?, ?)', [userId, 'user', message]);

    let snapshot = await getUserFinancialSnapshot(userId);

    const apiKey = (process.env.GROQ_API_KEY || '').trim();
    let aiResponse = '';
    let usedEngine = 'local';
    let usedModel = 'BudgetPH Math Engine (Local)';
    let actionReceipt = null;

    if (mode !== 'local' && apiKey) {
      const [recentRows] = await pool.query(
        'SELECT role, message FROM ai_conversations WHERE user_id = ? ORDER BY id DESC LIMIT 8',
        [userId]
      );
      const recentTurns = recentRows.reverse();

      const systemPrompt = `You are BudgetPH, an intelligent, empathetic, and proactive financial co-pilot for Filipino users.
You have direct autonomous tools to manage the user's budget database.

CRITICAL IDENTITY & PRIVACY RULES:
- You are chatting directly with user "${snapshot.user_name}".
- NEVER EVER ask the user for their "User ID", "Account ID", or internal database keys. The system handles all authentication automatically in the background.
- When the user mentions paying a bill (e.g. "electricity", "kuryente", "meralco", "wifi", "internet"), IMMEDIATELY call the 'mark_bill_paid' tool.

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
3. 'log_expense': Call when user logs an expense or purchase (e.g. "Lunch ₱250", "Pamasahe ₱50").
4. 'add_obligation_or_debt': Call when user mentions a new bill, debt, utang, or loan.
5. 'mark_bill_paid': Call when user mentions they paid a bill (e.g. "Nabayaran ko na kuryente").
6. 'deposit_to_savings': Call when user puts money into emergency fund or savings.
7. 'add_family_allowance': Call when adding a child or family dependent's regular allowance/baon to the budget.

Language Guidelines:
- If the user talks or prompts in Tagalog / Taglish, respond naturally in warm Taglish (mix of English & Tagalog).
- If the user talks in English, respond in clear, encouraging, professional English.
- App Default Language: ${lang === 'tl' ? 'Tagalog' : 'English'}.

Live Financial Context:
- User Name: ${snapshot.user_name}
- Pay Frequency: ${snapshot.pay_schedule}
- Safe Daily Budget: ₱${snapshot.daily_budget}
- Remaining Today: ₱${snapshot.remaining_today}
- Spent Today: ₱${snapshot.spent_today}
- Days until Next Payday: ${snapshot.days_until_payday} days
- Total Cycle Spendable Remaining: ₱${snapshot.spendable_remaining}
- Active Registered Bills: ${snapshot.active_bills_summary}
- Total Obligations Amount: ₱${snapshot.total_obligations_amount}
- Current Savings: ₱${snapshot.total_savings}

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
                timeout: 15000
              }
            );

            const choice = groqRes.data?.choices?.[0];
            if (choice) {
              successfulModel = mName;

              // Check if model called a tool
              if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
                const toolCall = choice.message.tool_calls[0];
                const toolName = toolCall.function.name;
                let toolArgs = {};
                try {
                  toolArgs = JSON.parse(toolCall.function.arguments || '{}');
                } catch (e) {
                  toolArgs = {};
                }

                // Execute tool in database
                const toolResult = await executeAiTool(toolName, toolArgs, userId);
                actionReceipt = toolResult;

                // Re-fetch fresh snapshot
                snapshot = await getUserFinancialSnapshot(userId);

                // Make follow-up call with tool result for natural synthesis
                const toolMessages = [
                  ...messages,
                  choice.message,
                  {
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: toolName,
                    content: JSON.stringify(toolResult)
                  }
                ];

                try {
                  const followUpRes = await axios.post(
                    'https://api.groq.com/openai/v1/chat/completions',
                    {
                      model: mName,
                      messages: toolMessages,
                      temperature: 0.5
                    },
                    {
                      headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                      },
                      timeout: 15000
                    }
                  );
                  aiResponse = followUpRes.data?.choices?.[0]?.message?.content || toolResult.summary;
                } catch (fuErr) {
                  aiResponse = toolResult.summary;
                }
              } else {
                aiResponse = choice.message?.content || '';
              }

              if (aiResponse) {
                usedEngine = 'groq';
                usedModel = successfulModel;
                break;
              }
            }
          } catch (modelErr) {
            console.warn(`Groq model ${mName} attempt failed:`, modelErr.response?.data?.error?.message || modelErr.message);
          }
        }

        if (aiResponse) {
          aiResponse = aiResponse.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
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

    // Save assistant response
    await pool.query('INSERT INTO ai_conversations (user_id, role, message) VALUES (?, ?, ?)', [userId, 'assistant', aiResponse]);

    res.json({
      success: true,
      message: aiResponse,
      action_receipt: actionReceipt,
      snapshot,
      engine: usedEngine,
      model: usedModel
    });
  } catch (error) {
    console.error('AI chat error in controller:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getConversationHistory(req, res) {
  try {
    const userId = 1;
    const [rows] = await pool.query(
      'SELECT role, message, created_at FROM ai_conversations WHERE user_id = ? ORDER BY id ASC LIMIT 50',
      [userId]
    );
    res.json({ success: true, history: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function clearConversationHistory(req, res) {
  try {
    const userId = 1;
    await pool.query('DELETE FROM ai_conversations WHERE user_id = ?', [userId]);
    res.json({ success: true, message: 'Chat history cleared' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export const getHistory = getConversationHistory;
export const clearHistory = clearConversationHistory;
