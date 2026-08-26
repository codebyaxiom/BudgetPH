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
              title: 'Overdue Bill Alert!',
              message: `Ang **${b.name}** (₱${Number(b.amount).toLocaleString()}) ay due noong ika-${b.due_day} at hindi pa bayad.`
            });
          } else if (diff <= 3) {
            const dayText = diff === 0 ? 'ngayong araw' : (diff === 1 ? 'bukas' : `sa loob ng ${diff} araw`);
            alerts.push({
              type: 'warning',
              title: 'Bill Due Soon',
              message: `Due ang **${b.name}** (₱${Number(b.amount).toLocaleString()}) ${dayText}.`
            });
          }
        }
      }
    }

    // 2. Daily spending state
    if (snapshot.remaining_today < 0) {
      alerts.push({
        type: 'danger',
        title: 'Over Daily Budget!',
        message: `Na-overspend ka ng **₱${Math.abs(snapshot.remaining_today).toLocaleString()}** ngayong araw. Magtipid bukas para makabawi!`
      });
    } else if (snapshot.daily_budget > 0 && snapshot.remaining_today >= 0) {
      alerts.push({
        type: 'success',
        title: 'On Track Today',
        message: `May **₱${snapshot.remaining_today.toLocaleString()}** ka pang spendable budget ngayong araw.`
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
    const { message } = req.body;
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

      const systemPrompt = `You are BudgetPH, a friendly and smart Filipino financial advisor (smart Ate/Kuya).
You speak naturally in Taglish (mix of English and Tagalog).
Ground all advice strictly in the user's real numbers:
- Daily Spendable Budget: ₱${snapshot.daily_budget}
- Remaining Today: ₱${snapshot.remaining_today}
- Spent Today: ₱${snapshot.spent_today}
- Days until Payday: ${snapshot.days_until_payday} days
- Total Cycle Spendable Remaining: ₱${snapshot.spendable_remaining}
- Pending Bills: ${snapshot.pending_obligations} bills
Always answer with clarity, warmth, and exact calculations.`;

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
      aiResponse = groqRes.data?.choices?.[0]?.message?.content || 'Pasensya na, walang tugon.';
    } else {
      // Local rule-based advisor
      const msg = message.toLowerCase();
      if (msg.includes('afford') || msg.includes('pwede') || msg.includes('bilhin') || msg.includes('bumili')) {
        const match = msg.match(/\d+[\d,]*/);
        const amount = match ? parseFloat(match[0].replace(/,/g, '')) : 0;
        if (amount > 0 && amount <= snapshot.remaining_today) {
          aiResponse = `✅ **Oo, kayang-kaya mo ito today!**\n- **Halaga:** ₱${amount.toLocaleString()}\n- **Daily remaining today:** ₱${snapshot.remaining_today.toLocaleString()}\n- **Matitira pa:** ₱${(snapshot.remaining_today - amount).toLocaleString()}\n\nPasok na pasok sa daily budget mo!`;
        } else if (amount > snapshot.remaining_today && amount <= snapshot.spendable_remaining) {
          aiResponse = `⚠️ **Kaya sa total cycle budget, pero ma-ooverspend ka for today.**\n- **Halaga:** ₱${amount.toLocaleString()}\n- **Daily remaining:** ₱${snapshot.remaining_today.toLocaleString()}\n- **Cycle spendable:** ₱${snapshot.spendable_remaining.toLocaleString()}\n\nKung bibilhin mo ito ngayon, kailangan magbawas sa mga susunod na araw (${snapshot.days_until_payday} days left).`;
        } else {
          aiResponse = `❌ **Hindi advisable bilhin ito ngayon.** Kulang ang natitirang spendable budget (₱${snapshot.spendable_remaining.toLocaleString()}) bago ang next sahod.`;
        }
      } else {
        aiResponse = `Kumusta! Narito ang quick budget pulse mo:\n- **Daily remaining today:** ₱${snapshot.remaining_today.toLocaleString()}\n- **Days until next payday:** ${snapshot.days_until_payday} days\n- **Pending bills:** ${snapshot.pending_obligations}\n\nTanungin mo ako kung may balak kang bilhin o bayaran!`;
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
