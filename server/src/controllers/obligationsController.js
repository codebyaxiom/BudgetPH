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

    const formatted = obligations.map(ob => {
      const isInst = Boolean(Number(ob.is_installment || 0)) || (ob.end_month !== null && ob.end_month !== undefined);
      
      const monthly = parseFloat(ob.monthly_amount || ob.amount);
      const endM = ob.end_month;
      const endY = ob.end_year;
      const totalMonths = isInst && endM && endY ? Math.max(1, (endY - currentYear) * 12 + (endM - currentMonth) + 1) : 1;
      const total = ob.total_amount ? parseFloat(ob.total_amount) : (isInst && endM ? (totalMonths * monthly) : monthly);
      const rem = ob.remaining_balance !== null && ob.remaining_balance !== undefined ? parseFloat(ob.remaining_balance) : total;

      return {
        ...ob,
        is_paid: Boolean(ob.is_paid),
        is_installment: isInst,
        end_month: isInst ? endM : null,
        end_year: isInst ? endY : null,
        total_amount: total,
        remaining_balance: rem,
        monthly_amount: monthly,
        status: ob.status === 'completed' || (!ob.is_active && isInst && rem <= 0) ? 'completed' : getObligationStatus(ob.due_day, Boolean(ob.is_paid))
      };
    });

    res.json({ success: true, obligations: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function saveObligation(req, res) {
  try {
    const userId = 1;
    const { 
      id, name, amount, category = 'other', due_day, frequency = 'monthly', 
      is_variable = false, is_active = 1, notes = '',
      is_installment = false, total_amount, remaining_balance, monthly_amount,
      end_month, end_year, creditor_name
    } = req.body;

    if (!name || !amount || !due_day) {
      return res.status(400).json({ success: false, error: 'Name, amount, and due day are required' });
    }

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    let finalTotal = total_amount ? parseFloat(total_amount) : null;
    let finalMonthly = monthly_amount ? parseFloat(monthly_amount) : parseFloat(amount);
    let finalRemaining = remaining_balance !== undefined && remaining_balance !== null ? parseFloat(remaining_balance) : null;
    let finalEndMonth = end_month ? parseInt(end_month, 10) : null;
    let finalEndYear = end_year ? parseInt(end_year, 10) : null;

    if (is_installment) {
      if (finalEndMonth && finalEndYear && !finalTotal) {
        const totalMonths = Math.max(1, (finalEndYear - currentYear) * 12 + (finalEndMonth - currentMonth) + 1);
        finalTotal = totalMonths * finalMonthly;
        if (finalRemaining === null) {
          finalRemaining = finalTotal;
        }
      } else if (finalTotal && !finalRemaining) {
        finalRemaining = finalTotal;
      }
    }

    let finalDueMonth = req.body.due_month ? parseInt(req.body.due_month, 10) : null;
    let finalDueYear = req.body.due_year ? parseInt(req.body.due_year, 10) : (finalDueMonth ? currentYear : null);
    if (!finalDueMonth && parseInt(due_day, 10) < new Date().getDate()) {
      finalDueMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      finalDueYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    }
    let finalDueDate = (finalDueMonth && finalDueYear) 
      ? `${finalDueYear}-${String(finalDueMonth).padStart(2, '0')}-${String(due_day).padStart(2, '0')}` 
      : null;

    if (id) {
      await pool.query(
        `UPDATE obligations
         SET name = ?, amount = ?, category = ?, due_day = ?, frequency = ?, is_variable = ?, is_active = ?, notes = ?,
             is_installment = ?, total_amount = ?, remaining_balance = ?, monthly_amount = ?,
             end_month = ?, end_year = ?, creditor_name = ?,
             due_month = ?, due_year = ?, due_date = ?
         WHERE id = ? AND user_id = ?`,
        [
          name, amount, category, due_day, frequency, is_variable ? 1 : 0, is_active, notes,
          is_installment ? 1 : 0, finalTotal, finalRemaining, finalMonthly,
          finalEndMonth, finalEndYear, creditor_name || null,
          finalDueMonth, finalDueYear, finalDueDate,
          id, userId
        ]
      );
      res.json({ success: true, id });
    } else {
      const [result] = await pool.query(
        `INSERT INTO obligations (
          user_id, name, amount, category, due_day, frequency, is_variable, is_active, notes,
          is_installment, total_amount, remaining_balance, monthly_amount,
          end_month, end_year, creditor_name, due_month, due_year, due_date, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId, name, amount, category, due_day, frequency, is_variable ? 1 : 0, is_active, notes,
          is_installment ? 1 : 0, finalTotal, finalRemaining, finalMonthly,
          finalEndMonth, finalEndYear, creditor_name || null,
          finalDueMonth, finalDueYear, finalDueDate, 'active'
        ]
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
    const { obligation_id, paid_date, amount_paid, is_advance = false, months_to_advance = 1 } = req.body;

    const [obRows] = await pool.query('SELECT * FROM obligations WHERE id = ? AND user_id = ?', [obligation_id, userId]);
    if (!obRows.length) return res.status(404).json({ success: false, error: 'Obligation not found' });

    const ob = obRows[0];
    const monthlyAmt = parseFloat(ob.monthly_amount || ob.amount);
    const finalAmount = amount_paid ? parseFloat(amount_paid) : (months_to_advance > 1 ? monthlyAmt * months_to_advance : monthlyAmt);
    const finalDate = paid_date || new Date().toISOString().split('T')[0];

    const activeCycle = await getActivePaydayCycle(userId);
    const cycleId = activeCycle ? activeCycle.id : null;

    let monthsCovered = months_to_advance || 1;
    if (amount_paid && monthlyAmt > 0) {
      monthsCovered = Math.max(1, Math.round(finalAmount / monthlyAmt));
    }

    let newBalance = ob.remaining_balance !== null ? Math.max(0, parseFloat(ob.remaining_balance) - finalAmount) : null;
    let newEndMonth = ob.end_month;
    let newEndYear = ob.end_year;
    let newStatus = ob.status || 'active';
    let newIsActive = ob.is_active;

    // Shift end date if advance payment (e.g. 2 months paid -> deduct 1 extra month from end date)
    if (ob.is_installment && ob.end_month && ob.end_year && monthsCovered > 1) {
      const extraMonths = monthsCovered - 1;
      newEndMonth -= extraMonths;
      while (newEndMonth < 1) {
        newEndMonth += 12;
        newEndYear -= 1;
      }
    }

    // If remaining balance is completely paid off, auto-complete the obligation
    if (ob.is_installment && (newBalance === 0 || (newEndMonth && newEndYear && (newEndYear < new Date().getFullYear() || (newEndYear === new Date().getFullYear() && newEndMonth < new Date().getMonth() + 1))))) {
      newStatus = 'completed';
      newIsActive = 0;
    }

    // Insert payment record
    const [result] = await pool.query(
      `INSERT INTO obligation_payments (obligation_id, user_id, payday_cycle_id, amount_paid, paid_date, months_covered, is_advance, balance_after)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [obligation_id, userId, cycleId, finalAmount, finalDate, monthsCovered, is_advance || monthsCovered > 1 ? 1 : 0, newBalance]
    );

    // Update obligation state
    if (ob.is_installment) {
      await pool.query(
        `UPDATE obligations
         SET remaining_balance = ?, end_month = ?, end_year = ?, status = ?, is_active = ?, paid_months_count = COALESCE(paid_months_count, 0) + ?
         WHERE id = ? AND user_id = ?`,
        [newBalance, newEndMonth, newEndYear, newStatus, newIsActive, monthsCovered, obligation_id, userId]
      );
    }

    res.json({ 
      success: true, 
      payment_id: result.insertId,
      months_covered: monthsCovered,
      remaining_balance: newBalance,
      end_month: newEndMonth,
      end_year: newEndYear,
      is_completed: newStatus === 'completed'
    });
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
