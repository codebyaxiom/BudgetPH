import pool from '../config/db.js';

export function getDaysUntilNextPayday(nextPaydayDate) {
  if (!nextPaydayDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const payday = new Date(nextPaydayDate);
  payday.setHours(0, 0, 0, 0);
  const diffTime = payday.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function getObligationStatus(dueDay, isPaid) {
  if (isPaid) return 'paid';
  const today = new Date().getDate();
  const due = parseInt(dueDay, 10);
  if (due < today) return 'overdue';
  if (due - today <= 3) return 'due-soon';
  return 'upcoming';
}

export async function getActivePaydayCycle(userId = 1) {
  const [rows] = await pool.query(
    `SELECT * FROM payday_cycles
     WHERE user_id = ? AND status IN ('active', 'simulated')
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

export async function getCycleBudgetMetrics(userId = 1) {
  const cycle = await getActivePaydayCycle(userId);
  if (!cycle) {
    return {
      active_cycle: null,
      wants_allocation: 0,
      total_expenses: 0,
      spendable_remaining: 0,
      days_until_payday: 0,
      cycle_total_days: 0,
      daily_budget: 0,
      spent_today: 0,
      remaining_today: 0
    };
  }

  // Wants / Spendable allocation
  const [wantsRows] = await pool.query(
    `SELECT SUM(amount) as total FROM payday_allocations WHERE payday_cycle_id = ? AND category = 'wants'`,
    [cycle.id]
  );
  const wants_allocation = parseFloat(wantsRows[0]?.total || 0);

  // Total expenses in cycle
  const [expRows] = await pool.query(
    `SELECT SUM(amount) as total FROM expenses WHERE user_id = ? AND payday_cycle_id = ?`,
    [userId, cycle.id]
  );
  const total_expenses = parseFloat(expRows[0]?.total || 0);
  const spendable_remaining = Math.max(0, wants_allocation - total_expenses);

  const days_until_payday = getDaysUntilNextPayday(cycle.next_payday_date);
  const days_divisor = Math.max(1, days_until_payday);
  const daily_budget = parseFloat((spendable_remaining / days_divisor).toFixed(2));

  // Today's expenses
  const todayStr = new Date().toISOString().split('T')[0];
  const [todayRows] = await pool.query(
    `SELECT SUM(amount) as total FROM expenses WHERE user_id = ? AND expense_date = ?`,
    [userId, todayStr]
  );
  const spent_today = parseFloat(todayRows[0]?.total || 0);
  const remaining_today = parseFloat((daily_budget - spent_today).toFixed(2));

  return {
    active_cycle: cycle,
    wants_allocation,
    total_expenses,
    spendable_remaining,
    days_until_payday,
    daily_budget,
    spent_today,
    remaining_today
  };
}

export async function getUserFinancialSnapshot(userId = 1) {
  const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
  const user = users[0] || null;

  const metrics = await getCycleBudgetMetrics(userId);
  const total_income = metrics.active_cycle ? parseFloat(metrics.active_cycle.expected_amount) : 0;

  // Obligations
  const [obData] = await pool.query(
    'SELECT COUNT(*) as count, SUM(amount) as total FROM obligations WHERE user_id = ? AND is_active = 1',
    [userId]
  );
  const total_obligations = parseInt(obData[0]?.count || 0, 10);
  const obligations_sum = parseFloat(obData[0]?.total || 0);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [paidRows] = await pool.query(
    `SELECT COUNT(*) as count FROM obligation_payments 
     WHERE user_id = ? AND MONTH(paid_date) = ? AND YEAR(paid_date) = ?`,
    [userId, currentMonth, currentYear]
  );
  const paid_obligations = parseInt(paidRows[0]?.count || 0, 10);
  const pending_obligations = Math.max(0, total_obligations - paid_obligations);

  // Upcoming bills
  const [upcoming_bills] = await pool.query(
    `SELECT o.*, 
            EXISTS (
              SELECT 1 FROM obligation_payments op 
              WHERE op.obligation_id = o.id 
                AND MONTH(op.paid_date) = ? AND YEAR(op.paid_date) = ?
            ) as is_paid
     FROM obligations o
     WHERE o.user_id = ? AND o.is_active = 1
     ORDER BY o.due_day ASC LIMIT 3`,
    [currentMonth, currentYear, userId]
  );

  // Recent expenses
  const [recent_expenses] = await pool.query(
    `SELECT e.*, fm.name as family_member_name
     FROM expenses e
     LEFT JOIN family_members fm ON e.family_member_id = fm.id
     WHERE e.user_id = ?
     ORDER BY e.expense_date DESC LIMIT 5`,
    [userId]
  );

  return {
    user,
    active_cycle: metrics.active_cycle,
    total_income,
    total_obligations,
    obligations_sum,
    paid_obligations,
    pending_obligations,
    daily_budget: metrics.daily_budget,
    days_until_payday: metrics.days_until_payday,
    spendable_remaining: metrics.spendable_remaining,
    spent_today: metrics.spent_today,
    remaining_today: metrics.remaining_today,
    upcoming_bills: upcoming_bills.map(b => ({
      ...b,
      is_paid: Boolean(b.is_paid),
      status: getObligationStatus(b.due_day, Boolean(b.is_paid))
    })),
    recent_expenses
  };
}
