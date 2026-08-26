import pool from '../config/db.js';
import { getCycleBudgetMetrics, getActivePaydayCycle } from '../utils/calculator.js';

export async function getDailyData(req, res) {
  try {
    const userId = 1;
    const metrics = await getCycleBudgetMetrics(userId);
    const todayStr = new Date().toISOString().split('T')[0];

    const [expenses] = await pool.query(
      `SELECT e.*, fm.name as member_name
       FROM expenses e
       LEFT JOIN family_members fm ON e.family_member_id = fm.id
       WHERE e.user_id = ? AND e.expense_date = ?
       ORDER BY e.created_at DESC`,
      [userId, todayStr]
    );

    const [familyMembers] = await pool.query('SELECT * FROM family_members WHERE user_id = ?', [userId]);

    res.json({
      success: true,
      metrics,
      todayExpenses: expenses,
      familyMembers
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getAllExpenses(req, res) {
  try {
    const userId = 1;
    const { startDate, endDate, category, search, limit = 50 } = req.query;

    let query = `
      SELECT e.*, fm.name as member_name
      FROM expenses e
      LEFT JOIN family_members fm ON e.family_member_id = fm.id
      WHERE e.user_id = ?
    `;
    const params = [userId];

    if (startDate) {
      query += ' AND e.expense_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND e.expense_date <= ?';
      params.push(endDate);
    }
    if (category && category !== 'all') {
      query += ' AND e.category = ?';
      params.push(category);
    }
    if (search) {
      query += ' AND e.description LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY e.expense_date DESC, e.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const [expenses] = await pool.query(query, params);
    res.json({ success: true, expenses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function logExpense(req, res) {
  try {
    const userId = 1;
    const { description, amount, category = 'other', mood = 'need', family_member_id, expense_date } = req.body;

    if (!description || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'Valid description and amount required' });
    }

    const activeCycle = await getActivePaydayCycle(userId);
    const cycleId = activeCycle ? activeCycle.id : null;
    const dateToUse = expense_date || new Date().toISOString().split('T')[0];

    const [result] = await pool.query(
      `INSERT INTO expenses (user_id, payday_cycle_id, family_member_id, amount, category, description, mood, expense_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, cycleId, family_member_id || null, amount, category, description, mood, dateToUse]
    );

    res.json({ success: true, expense_id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function deleteExpense(req, res) {
  try {
    const userId = 1;
    const { id } = req.params;
    await pool.query('DELETE FROM expenses WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
