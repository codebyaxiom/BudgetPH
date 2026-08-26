import pool from '../config/db.js';
import { getActivePaydayCycle } from '../utils/calculator.js';

export async function getPaydaySetup(req, res) {
  try {
    const userId = 1;
    const [incomes] = await pool.query('SELECT * FROM income_sources WHERE user_id = ?', [userId]);
    const [obligations] = await pool.query('SELECT * FROM obligations WHERE user_id = ? AND is_active = 1 ORDER BY due_day ASC', [userId]);
    const [allowances] = await pool.query(`
      SELECT a.*, fm.name as member_name, fm.role as member_role 
      FROM allowances a
      JOIN family_members fm ON a.family_member_id = fm.id
      WHERE a.user_id = ?
    `, [userId]);
    const [familyMembers] = await pool.query('SELECT * FROM family_members WHERE user_id = ?', [userId]);
    const activeCycle = await getActivePaydayCycle(userId);

    res.json({
      success: true,
      incomes,
      obligations,
      allowances,
      familyMembers,
      activeCycle
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function simulatePayday(req, res) {
  const connection = await pool.getConnection();
  try {
    const userId = 1;
    const { income_source_id, payday_date, next_payday_date, expected_amount, actual_amount, allocations } = req.body;

    await connection.beginTransaction();

    // Mark previous cycles completed
    await connection.query(
      "UPDATE payday_cycles SET status = 'completed' WHERE user_id = ? AND status = 'active'",
      [userId]
    );

    // Insert new active cycle
    const [cycleResult] = await connection.query(
      `INSERT INTO payday_cycles (user_id, income_source_id, payday_date, next_payday_date, expected_amount, actual_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [userId, income_source_id || null, payday_date, next_payday_date, expected_amount, actual_amount || expected_amount]
    );
    const cycleId = cycleResult.insertId;

    // Insert allocations into payday_allocations (columns: payday_cycle_id, category, reference_id, label, amount)
    if (Array.isArray(allocations)) {
      for (const al of allocations) {
        if (parseFloat(al.amount) > 0) {
          const categoryEnum = ['obligation','allowance','savings','emergency_fund','sinking_fund','wants'].includes(al.category) 
            ? al.category 
            : 'wants';
          await connection.query(
            `INSERT INTO payday_allocations (payday_cycle_id, category, reference_id, label, amount)
             VALUES (?, ?, ?, ?, ?)`,
            [cycleId, categoryEnum, al.target_id || null, al.notes || al.category, al.amount]
          );
        }
      }
    }

    await connection.commit();
    res.json({ success: true, cycle_id: cycleId });
  } catch (error) {
    await connection.rollback();
    console.error('Simulate error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
}

export async function getPaydayCycles(req, res) {
  try {
    const userId = 1;
    const [cycles] = await pool.query(
      'SELECT * FROM payday_cycles WHERE user_id = ? ORDER BY payday_date DESC',
      [userId]
    );
    res.json({ success: true, cycles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
