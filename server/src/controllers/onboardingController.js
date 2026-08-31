import pool from '../config/db.js';
import { getUserFinancialSnapshot } from '../utils/calculator.js';

export async function getOnboardingStatus(req, res) {
  try {
    const userId = 1;
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    const user = users[0] || null;

    if (!user) {
      return res.json({
        success: true,
        profile_completed: false,
        user: null,
        hasActiveCycle: false
      });
    }

    const [cycles] = await pool.query(
      "SELECT id FROM payday_cycles WHERE user_id = ? AND status = 'active' LIMIT 1",
      [userId]
    );

    res.json({
      success: true,
      profile_completed: Boolean(user.profile_completed),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile_completed: user.profile_completed
      },
      hasActiveCycle: cycles.length > 0
    });
  } catch (error) {
    console.error('getOnboardingStatus error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function completeFastTrackOnboarding(req, res) {
  const connection = await pool.getConnection();
  try {
    const userId = 1;
    const name = req.body.name || 'Ka-Budget';
    const income_amount = req.body.income_amount || req.body.incomeAmount;
    const frequency = req.body.frequency || 'semi-monthly';
    const next_payday_date = req.body.next_payday_date || req.body.nextPaydayDate;
    const bills = req.body.bills || [];
    const emergency_fund_contribution = req.body.emergency_fund_contribution || req.body.emergencyAmount || 0;

    if (!income_amount || !next_payday_date) {
      return res.status(400).json({
        success: false,
        error: 'Income amount and next payday date are required.'
      });
    }

    await connection.beginTransaction();

    // 1. Update or create user
    const [userCheck] = await connection.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (userCheck.length > 0) {
      await connection.query(
        'UPDATE users SET name = ?, profile_completed = 1 WHERE id = ?',
        [name || 'Ka-Budget', userId]
      );
    } else {
      await connection.query(
        'INSERT INTO users (id, name, email, profile_completed) VALUES (?, ?, ?, 1)',
        [userId, name || 'Ka-Budget', 'user@budgetph.local']
      );
    }

    // 2. Insert or update primary income source
    await connection.query('DELETE FROM income_sources WHERE user_id = ?', [userId]);
    const [incResult] = await connection.query(
      `INSERT INTO income_sources (user_id, name, amount, frequency, payday_1, payday_2, is_active)
       VALUES (?, 'Pangunahing Sahod', ?, ?, 15, 30, 1)`,
      [userId, parseFloat(income_amount), frequency]
    );
    const incomeSourceId = incResult.insertId;

    // 3. Insert obligations / bills
    await connection.query('DELETE FROM obligations WHERE user_id = ?', [userId]);
    let totalObligations = 0;
    const insertedObligations = [];

    if (Array.isArray(bills) && bills.length > 0) {
      for (const bill of bills) {
        const amount = parseFloat(bill.amount) || 0;
        if (amount > 0) {
          totalObligations += amount;
          const [obRes] = await connection.query(
            `INSERT INTO obligations (user_id, name, category, amount, due_day, cutoff_assignment, is_active)
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [
              userId,
              bill.name || 'Monthly Bill',
              bill.category || 'other',
              amount,
              bill.due_day || 15,
              bill.cutoff_assignment || 'auto'
            ]
          );
          insertedObligations.push({
            id: obRes.insertId,
            name: bill.name,
            amount
          });
        }
      }
    }

    // 4. Emergency Fund Goal (if provided)
    const savingsAmount = parseFloat(emergency_fund_contribution) || 0;
    if (savingsAmount > 0) {
      const [existingGoals] = await connection.query(
        "SELECT id FROM savings_goals WHERE user_id = ? AND type = 'emergency_fund'",
        [userId]
      );
      if (existingGoals.length === 0) {
        await connection.query(
          `INSERT INTO savings_goals (user_id, name, type, target_amount, current_amount, per_payday_contribution, is_active)
           VALUES (?, 'Emergency Fund (Safety Net)', 'emergency_fund', ?, ?, ?, 1)`,
          [userId, parseFloat(income_amount) * 3, savingsAmount, savingsAmount]
        );
      }
    }

    // 5. Create Active Payday Cycle
    await connection.query(
      "UPDATE payday_cycles SET status = 'completed' WHERE user_id = ? AND status = 'active'",
      [userId]
    );

    const todayStr = new Date().toISOString().split('T')[0];
    const parsedIncome = parseFloat(income_amount);
    const spendableWants = Math.max(0, parsedIncome - totalObligations - savingsAmount);

    const [cycleResult] = await connection.query(
      `INSERT INTO payday_cycles (user_id, income_source_id, expected_amount, actual_amount, payday_date, next_payday_date, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [userId, incomeSourceId, parsedIncome, parsedIncome, todayStr, next_payday_date]
    );
    const cycleId = cycleResult.insertId;

    // 6. Record allocations
    for (const ob of insertedObligations) {
      await connection.query(
        `INSERT INTO payday_allocations (payday_cycle_id, category, reference_id, label, amount)
         VALUES (?, 'obligation', ?, ?, ?)`,
        [cycleId, ob.id, ob.name, ob.amount]
      );
    }

    if (savingsAmount > 0) {
      await connection.query(
        `INSERT INTO payday_allocations (payday_cycle_id, category, reference_id, label, amount)
         VALUES (?, 'emergency_fund', NULL, 'Emergency Fund Ipon', ?)`,
        [cycleId, savingsAmount]
      );
    }

    await connection.query(
      `INSERT INTO payday_allocations (payday_cycle_id, category, reference_id, label, amount)
       VALUES (?, 'wants', NULL, 'Spendable Balance (Pang-Araw-Araw)', ?)`,
      [cycleId, spendableWants]
    );

    await connection.commit();

    // Fetch updated financial snapshot
    const snapshot = await getUserFinancialSnapshot(userId);

    res.json({
      success: true,
      message: 'Onboarding completed successfully!',
      cycle_id: cycleId,
      snapshot
    });
  } catch (error) {
    await connection.rollback();
    console.error('completeFastTrackOnboarding error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
}
