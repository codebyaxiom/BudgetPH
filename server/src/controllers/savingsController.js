import pool from '../config/db.js';

export async function getSavings(req, res) {
  try {
    const userId = 1;
    const [goals] = await pool.query(
      'SELECT * FROM savings_goals WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC',
      [userId]
    );

    // Calculate totals
    const totalTarget = goals.reduce((sum, g) => sum + parseFloat(g.target_amount || 0), 0);
    const totalCurrent = goals.reduce((sum, g) => sum + parseFloat(g.current_amount || 0), 0);
    const totalPerPayday = goals.reduce((sum, g) => sum + parseFloat(g.per_payday_contribution || 0), 0);

    // Get monthly living expenses for emergency fund month calculation
    const [obSum] = await pool.query('SELECT SUM(amount) as total FROM obligations WHERE user_id = ? AND is_active = 1', [userId]);
    const monthlyBills = parseFloat(obSum[0]?.total || 15000);
    
    const emergencyFundGoal = goals.find(g => g.type === 'emergency_fund');
    const emergencyFundAmount = emergencyFundGoal ? parseFloat(emergencyFundGoal.current_amount || 0) : 0;
    const emergencyFundMonths = monthlyBills > 0 ? (emergencyFundAmount / monthlyBills).toFixed(1) : 0;

    res.json({
      success: true,
      goals: goals.map(g => ({
        ...g,
        progress_pct: g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0
      })),
      summary: {
        totalTarget,
        totalCurrent,
        totalPerPayday,
        emergencyFundMonths: parseFloat(emergencyFundMonths),
        monthlyBillsBenchmark: monthlyBills
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function createGoal(req, res) {
  try {
    const userId = 1;
    const { name, type = 'regular', target_amount, current_amount = 0, target_date, per_payday_contribution = 0 } = req.body;

    const [result] = await pool.query(
      'INSERT INTO savings_goals (user_id, name, type, target_amount, current_amount, target_date, per_payday_contribution, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
      [userId, name, type, target_amount, current_amount, target_date || null, per_payday_contribution]
    );

    res.json({ success: true, message: 'Savings goal created', goalId: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function depositToGoal(req, res) {
  try {
    const userId = 1;
    const { goal_id, amount } = req.body;
    const deposit = parseFloat(amount) || 0;

    if (deposit <= 0) {
      return res.status(400).json({ success: false, error: 'Deposit amount must be positive' });
    }

    await pool.query(
      'UPDATE savings_goals SET current_amount = current_amount + ? WHERE id = ? AND user_id = ?',
      [deposit, goal_id, userId]
    );

    res.json({ success: true, message: `Successfully deposited ₱${deposit.toLocaleString()}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function deleteGoal(req, res) {
  try {
    const userId = 1;
    const { id } = req.params;

    await pool.query('UPDATE savings_goals SET is_active = 0 WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ success: true, message: 'Goal archived' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
