import pool from '../config/db.js';
import { getObligationStatus, getActivePaydayCycle } from '../utils/calculator.js';

export async function getObligations(req, res) {
  try {
    const userId = 1;
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const [obligations] = await pool.query(
      `SELECT o.*,
              EXISTS (
                SELECT 1 FROM obligation_payments op
                WHERE op.obligation_id = o.id
                  AND MONTH(op.paid_date) = ?
                  AND YEAR(op.paid_date) = ?
              ) as is_paid,
              (
                SELECT op.paid_date FROM obligation_payments op
                WHERE op.obligation_id = o.id
                  AND MONTH(op.paid_date) = ?
                  AND YEAR(op.paid_date) = ?
                ORDER BY op.paid_date DESC LIMIT 1
              ) as paid_date,
              (
                SELECT op.amount_paid FROM obligation_payments op
                WHERE op.obligation_id = o.id
                  AND MONTH(op.paid_date) = ?
                  AND YEAR(op.paid_date) = ?
                ORDER BY op.paid_date DESC LIMIT 1
              ) as last_amount_paid
       FROM obligations o
       WHERE o.user_id = ?
       ORDER BY o.is_active DESC, o.due_day ASC`,
      [currentMonth, currentYear, currentMonth, currentYear, currentMonth, currentYear, userId]
    );

    const formatted = obligations.map(ob => ({
      ...ob,
      is_paid: Boolean(ob.is_paid),
      status: getObligationStatus(ob.due_day, Boolean(ob.is_paid))
    }));

    res.json({ success: true, obligations: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function saveObligation(req, res) {
  try {
    const userId = 1;
    const { id, name, amount, category = 'other', due_day, frequency = 'monthly', is_variable = false, is_active = 1, notes = '' } = req.body;

    if (!name || !amount || !due_day) {
      return res.status(400).json({ success: false, error: 'Name, amount, and due day are required' });
    }

    if (id) {
      await pool.query(
        `UPDATE obligations
         SET name = ?, amount = ?, category = ?, due_day = ?, frequency = ?, is_variable = ?, is_active = ?, notes = ?
         WHERE id = ? AND user_id = ?`,
        [name, amount, category, due_day, frequency, is_variable ? 1 : 0, is_active, notes, id, userId]
      );
      res.json({ success: true, id });
    } else {
      const [result] = await pool.query(
        `INSERT INTO obligations (user_id, name, amount, category, due_day, frequency, is_variable, is_active, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, name, amount, category, due_day, frequency, is_variable ? 1 : 0, is_active, notes]
      );
      res.json({ success: true, id: result.insertId });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function toggleActive(req, res) {
  try {
    const userId = 1;
    const { id } = req.params;
    await pool.query('UPDATE obligations SET is_active = 1 - is_active WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function deleteObligation(req, res) {
  try {
    const userId = 1;
    const { id } = req.params;
    await pool.query('DELETE FROM obligations WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function markPaid(req, res) {
  try {
    const userId = 1;
    const { obligation_id, paid_date, amount_paid } = req.body;

    const [obRows] = await pool.query('SELECT amount FROM obligations WHERE id = ? AND user_id = ?', [obligation_id, userId]);
    if (!obRows.length) return res.status(404).json({ success: false, error: 'Obligation not found' });

    const finalAmount = amount_paid ? parseFloat(amount_paid) : parseFloat(obRows[0].amount);
    const finalDate = paid_date || new Date().toISOString().split('T')[0];

    const activeCycle = await getActivePaydayCycle(userId);
    const cycleId = activeCycle ? activeCycle.id : null;

    const [result] = await pool.query(
      `INSERT INTO obligation_payments (obligation_id, user_id, payday_cycle_id, amount_paid, paid_date)
       VALUES (?, ?, ?, ?, ?)`,
      [obligation_id, userId, cycleId, finalAmount, finalDate]
    );

    res.json({ success: true, payment_id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function unmarkPaid(req, res) {
  try {
    const userId = 1;
    const { obligation_id } = req.body;
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    await pool.query(
      `DELETE FROM obligation_payments 
       WHERE obligation_id = ? AND user_id = ? AND MONTH(paid_date) = ? AND YEAR(paid_date) = ?`,
      [obligation_id, userId, currentMonth, currentYear]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
