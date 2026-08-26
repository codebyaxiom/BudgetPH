import pool from '../config/db.js';
import axios from 'axios';
import { getUserFinancialSnapshot } from '../utils/calculator.js';

export async function getHistory(req, res) {
  try {
    const userId = 1;
    const [rows] = await pool.query(
      'SELECT id, role, message, created_at FROM ai_conversations WHERE user_id = ? ORDER BY created_at ASC LIMIT 50',
      [userId]
    );
    res.json({ success: true, history: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function clearHistory(req, res) {
  try {
    const userId = 1;
    await pool.query('DELETE FROM ai_conversations WHERE user_id = ?', [userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getProactiveAlerts(req, res) {
  try {
    const userId = 1;
    const lang = req.query.lang || 'en';
    const snapshot = await getUserFinancialSnapshot(userId);
    const alerts = [];
    const today = new Date().getDate();

    // 1. Overdue or due soon bills
    if (snapshot.upcoming_bills?.length) {
      for (const b of snapshot.upcoming_bills) {
        if (!b.is_paid) {
          const diff = b.due_day - today;
          if (diff < 0) {
            alerts.push({
              type: 'danger',
              title: lang === 'tl' ? 'Overdue Bill Alert!' : 'Overdue Bill Alert!',
              message: lang === 'tl'
                ? `Ang **${b.name}** (₱${Number(b.amount).toLocaleString()}) ay due noong ika-${b.due_day} at hindi pa bayad.`
                : `**${b.name}** (₱${Number(b.amount).toLocaleString()}) was due on the ${b.due_day}th and is still unpaid.`
            });
          } else if (diff <= 3) {
            const dayTextTl = diff === 0 ? 'ngayong araw' : (diff === 1 ? 'bukas' : `sa loob ng ${diff} araw`);
            const dayTextEn = diff === 0 ? 'today' : (diff === 1 ? 'tomorrow' : `in ${diff} days`);
            alerts.push({
              type: 'warning',
              title: lang === 'tl' ? 'Parating na Bayarin' : 'Bill Due Soon',
              message: lang === 'tl'
                ? `Due ang **${b.name}** (₱${Number(b.amount).toLocaleString()}) ${dayTextTl}.`
                : `**${b.name}** (₱${Number(b.amount).toLocaleString()}) is due ${dayTextEn}.`
            });
          }
        }
      }
    }

    // 2. Daily spending state
    if (snapshot.remaining_today < 0) {
      alerts.push({
        type: 'danger',
        title: lang === 'tl' ? 'Over Daily Budget!' : 'Over Daily Budget!',
        message: lang === 'tl'
          ? `Na-overspend ka ng **₱${Math.abs(snapshot.remaining_today).toLocaleString()}** ngayong araw. Magtipid bukas para makabawi!`
          : `You have exceeded today's budget by **₱${Math.abs(snapshot.remaining_today).toLocaleString()}**. Consider trimming tomorrow's spending!`
      });
    } else if (snapshot.daily_budget > 0 && snapshot.remaining_today >= 0) {
      alerts.push({
        type: 'success',
        title: lang === 'tl' ? 'On Track Today' : 'On Track Today',
        message: lang === 'tl'
          ? `May **₱${snapshot.remaining_today.toLocaleString()}** ka pang spendable budget ngayong araw.`
          : `You have **₱${snapshot.remaining_today.toLocaleString()}** remaining in your safe daily budget today.`
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
    const { message, lang = 'en' } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'Message required' });

    // Save user message
    await pool.query('INSERT INTO ai_conversations (user_id, role, message) VALUES (?, ?, ?)', [userId, 'user', message]);

    const snapshot = await getUserFinancialSnapshot(userId);

    // Call Groq API or Fallback
    const apiKey = process.env.GROQ_API_KEY;
    let aiResponse = '';

    if (apiKey && apiKey.trim()) {
      const [recentRows] = await pool.query(
        'SELECT role, message FROM ai_conversations WHERE user_id = ? ORDER BY id DESC LIMIT 6',
        [userId]
      );
      const recentTurns = recentRows.reverse();

      const systemPrompt = `You are BudgetPH, a friendly, smart, and empowering financial advisor for Filipino users.
Language Guidelines:
- If the user talks or prompts in Tagalog / Taglish, respond naturally in warm Taglish (mix of English & Tagalog).
- If the user talks in English, respond in clear, encouraging, professional English.
- App Default Language: ${lang === 'tl' ? 'Tagalog' : 'English'}.
Live Financial Context of User:
- Daily Spendable Budget: ₱${snapshot.daily_budget}
- Remaining Today: ₱${snapshot.remaining_today}
- Spent Today: ₱${snapshot.spent_today}
- Days until Payday: ${snapshot.days_until_payday} days
- Total Cycle Spendable Remaining: ₱${snapshot.spendable_remaining}
- Pending Bills: ${snapshot.pending_obligations} bills
Always answer with clarity, warmth, and exact arithmetic based on these numbers.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...recentTurns.map(t => ({ role: t.role === 'assistant' ? 'assistant' : 'user', content: t.message })),
        { role: 'user', content: message }
      ];

      const groqRes = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: process.env.GROQ_MODEL || 'llama3-70b-8192',
          messages,
          temperature: 0.6
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );
      aiResponse = groqRes.data?.choices?.[0]?.message?.content || (lang === 'tl' ? 'Pasensya na, walang tugon mula sa AI.' : 'Sorry, no response from AI.');
    } else {
      // Local rule-based advisor
      const msg = message.toLowerCase();
      const isTagalogInput = msg.includes('pwede') || msg.includes('bilhin') || msg.includes('bumili') || msg.includes('gastos') || msg.includes('magkano') || lang === 'tl';

      if (msg.includes('afford') || msg.includes('pwede') || msg.includes('bilhin') || msg.includes('bumili') || msg.includes('buy')) {
        const match = msg.match(/\d+[\d,]*/);
        const amount = match ? parseFloat(match[0].replace(/,/g, '')) : 0;

        if (isTagalogInput) {
          if (amount > 0 && amount <= snapshot.remaining_today) {
            aiResponse = `✅ **Oo, kayang-kaya mo ito today!**\n- **Halaga:** ₱${amount.toLocaleString()}\n- **Daily remaining today:** ₱${snapshot.remaining_today.toLocaleString()}\n- **Matitira pa:** ₱${(snapshot.remaining_today - amount).toLocaleString()}\n\nPasok na pasok sa safe daily budget mo!`;
          } else if (amount > snapshot.remaining_today && amount <= snapshot.spendable_remaining) {
            aiResponse = `⚠️ **Kaya sa total cycle budget, pero ma-ooverspend ka for today.**\n- **Halaga:** ₱${amount.toLocaleString()}\n- **Daily remaining:** ₱${snapshot.remaining_today.toLocaleString()}\n- **Cycle spendable:** ₱${snapshot.spendable_remaining.toLocaleString()}\n\nKung bibilhin mo ito ngayon, kailangan magbawas sa mga susunod na araw (${snapshot.days_until_payday} araw na lang bago mag-sahod).`;
          } else {
            aiResponse = `❌ **Hindi advisable bilhin ito ngayon.** Kulang ang natitirang spendable budget (₱${snapshot.spendable_remaining.toLocaleString()}) bago ang next sahod.`;
          }
        } else {
          if (amount > 0 && amount <= snapshot.remaining_today) {
            aiResponse = `✅ **Yes, you can comfortably afford this today!**\n- **Purchase Amount:** ₱${amount.toLocaleString()}\n- **Daily Remaining Today:** ₱${snapshot.remaining_today.toLocaleString()}\n- **Remaining After Purchase:** ₱${(snapshot.remaining_today - amount).toLocaleString()}\n\nThis fits comfortably within your safe daily budget!`;
          } else if (amount > snapshot.remaining_today && amount <= snapshot.spendable_remaining) {
            aiResponse = `⚠️ **Covered by total cycle budget, but exceeds today's daily limit.**\n- **Amount:** ₱${amount.toLocaleString()}\n- **Safe Daily Limit Remaining:** ₱${snapshot.remaining_today.toLocaleString()}\n- **Total Cycle Spendable:** ₱${snapshot.spendable_remaining.toLocaleString()}\n\nIf you make this purchase, you'll need to trim spending over the next ${snapshot.days_until_payday} days before payday.`;
          } else {
            aiResponse = `❌ **Not recommended right now.** Your remaining spendable balance (₱${snapshot.spendable_remaining.toLocaleString()}) cannot cover this amount before next payday.`;
          }
        }
      } else {
        if (isTagalogInput) {
          aiResponse = `Kumusta! Narito ang quick budget pulse mo:\n- **Safe na pwedeng gastusin today:** ₱${snapshot.remaining_today.toLocaleString()}\n- **Araw bago ang susunod na sahod:** ${snapshot.days_until_payday} araw\n- **Mga parating na bills:** ${snapshot.pending_obligations}\n\nMagtanong kung may balak kang bilhin o pag-ipunan!`;
        } else {
          aiResponse = `Hello! Here is your quick budget pulse:\n- **Safe Spendable Today:** ₱${snapshot.remaining_today.toLocaleString()}\n- **Days Until Next Payday:** ${snapshot.days_until_payday} days\n- **Pending Obligations:** ${snapshot.pending_obligations} bills\n\nFeel free to ask if you can afford a purchase or how to plan your upcoming expenses!`;
        }
      }
    }

    // Save assistant response
    await pool.query('INSERT INTO ai_conversations (user_id, role, message) VALUES (?, ?, ?)', [userId, 'assistant', aiResponse]);

    res.json({ success: true, message: aiResponse });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
