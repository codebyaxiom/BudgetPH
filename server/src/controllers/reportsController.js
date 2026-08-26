import pool from '../config/db.js';

export async function getAnalytics(req, res) {
  try {
    const userId = 1;

    // 1. Category Expenses
    const [catRows] = await pool.query(
      `SELECT category, SUM(amount) as total, COUNT(*) as count 
       FROM expenses 
       WHERE user_id = ? 
       GROUP BY category 
       ORDER BY total DESC`,
      [userId]
    );

    // 2. Mood Breakdown (Need vs Want vs Regret)
    const [moodRows] = await pool.query(
      `SELECT COALESCE(mood, 'need') as mood, SUM(amount) as total, COUNT(*) as count 
       FROM expenses 
       WHERE user_id = ? 
       GROUP BY mood`,
      [userId]
    );

    // 3. Daily spending trend (last 14 days)
    const [dailyRows] = await pool.query(
      `SELECT expense_date, SUM(amount) as total 
       FROM expenses 
       WHERE user_id = ? AND expense_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
       GROUP BY expense_date 
       ORDER BY expense_date ASC`,
      [userId]
    );

    // 4. Financial Health Score calculation
    const [incRows] = await pool.query('SELECT SUM(amount) as total FROM income_sources WHERE user_id = ?', [userId]);
    const [obRows] = await pool.query('SELECT SUM(amount) as total FROM obligations WHERE user_id = ? AND is_active = 1', [userId]);
    const [savRows] = await pool.query('SELECT SUM(current_amount) as saved, SUM(target_amount) as target FROM savings_goals WHERE user_id = ? AND is_active = 1', [userId]);

    const income = parseFloat(incRows[0]?.total || 30000);
    const obligations = parseFloat(obRows[0]?.total || 15000);
    const savings = parseFloat(savRows[0]?.saved || 5000);
    
    const totalExpenses = catRows.reduce((sum, r) => sum + parseFloat(r.total || 0), 0);
    const regretTotal = moodRows.find(m => m.mood === 'regret')?.total || 0;
    const regretPct = totalExpenses > 0 ? (regretTotal / totalExpenses) * 100 : 0;
    const obRatio = income > 0 ? (obligations / income) * 100 : 50;

    let healthScore = 70;
    if (obRatio <= 50) healthScore += 10;
    else healthScore -= 10;

    if (regretPct < 5) healthScore += 10;
    else if (regretPct > 15) healthScore -= 15;

    if (savings > obligations * 0.5) healthScore += 10;

    healthScore = Math.max(10, Math.min(98, healthScore));

    res.json({
      success: true,
      categories: catRows.map(c => ({
        name: c.category,
        total: parseFloat(c.total),
        count: c.count
      })),
      moods: moodRows.map(m => ({
        name: m.mood,
        total: parseFloat(m.total),
        count: m.count
      })),
      dailyTrend: dailyRows.map(d => ({
        date: d.expense_date,
        total: parseFloat(d.total)
      })),
      health: {
        score: healthScore,
        income,
        obligations,
        savings,
        totalExpenses,
        regretPercentage: Math.round(regretPct),
        obligationsRatio: Math.round(obRatio)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
