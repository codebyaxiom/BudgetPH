import pool from '../config/db.js';

export async function getSettings(req, res) {
  try {
    const userId = 1;
    const [userRows] = await pool.query('SELECT id, name, email, civil_status, profile_completed FROM users WHERE id = ?', [userId]);
    const [incomeRows] = await pool.query('SELECT * FROM income_sources WHERE user_id = ?', [userId]);
    const [settingsRows] = await pool.query('SELECT setting_key, setting_value FROM settings WHERE user_id = ?', [userId]);

    const settingsMap = {};
    settingsRows.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });

    res.json({
      success: true,
      user: userRows[0] || {},
      incomes: incomeRows,
      settings: settingsMap
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function updateProfile(req, res) {
  try {
    const userId = 1;
    const { name, email, civil_status, salary_amount, pay_schedule = '15_30' } = req.body;

    if (name) {
      await pool.query('UPDATE users SET name = ?, email = ?, civil_status = ? WHERE id = ?', [name, email, civil_status, userId]);
    }

    if (salary_amount) {
      const [existing] = await pool.query('SELECT id FROM income_sources WHERE user_id = ?', [userId]);
      if (existing.length > 0) {
        await pool.query('UPDATE income_sources SET amount = ? WHERE id = ?', [salary_amount, existing[0].id]);
      } else {
        await pool.query('INSERT INTO income_sources (user_id, source_name, amount, frequency) VALUES (?, "Primary Salary", ?, "per-payday")', [userId, salary_amount]);
      }
    }

    if (pay_schedule) {
      await pool.query(
        'INSERT INTO settings (user_id, setting_key, setting_value) VALUES (?, "pay_schedule", ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [userId, pay_schedule, pay_schedule]
      );
    }

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function exportData(req, res) {
  try {
    const userId = 1;
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    const [expenses] = await pool.query('SELECT * FROM expenses WHERE user_id = ?', [userId]);
    const [obligations] = await pool.query('SELECT * FROM obligations WHERE user_id = ?', [userId]);
    const [allowances] = await pool.query('SELECT * FROM allowances WHERE user_id = ?', [userId]);
    const [savings] = await pool.query('SELECT * FROM savings_goals WHERE user_id = ?', [userId]);
    const [cycles] = await pool.query('SELECT * FROM payday_cycles WHERE user_id = ?', [userId]);

    res.json({
      success: true,
      exportDate: new Date().toISOString(),
      data: {
        user: users[0],
        expenses,
        obligations,
        allowances,
        savings_goals: savings,
        payday_cycles: cycles
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
