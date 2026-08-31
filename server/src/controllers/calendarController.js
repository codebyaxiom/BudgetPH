import pool from '../config/db.js';

export async function getMonthCalendarData(req, res) {
  try {
    const userId = 1;
    const { month } = req.query; // format: 'YYYY-MM', defaults to current month

    const today = new Date();
    const targetMonth = month || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const [yearStr, monStr] = targetMonth.split('-');
    const year = parseInt(yearStr);
    const mon = parseInt(monStr);

    const startDate = `${targetMonth}-01`;
    const lastDayOfMonth = new Date(year, mon, 0).getDate();
    const endDate = `${targetMonth}-${String(lastDayOfMonth).padStart(2, '0')}`;

    // 1. Fetch all expenses for this month
    const [expenses] = await pool.query(`
      SELECT e.id, e.description, e.amount, e.category, e.mood, e.expense_date, fm.name as family_member_name
      FROM expenses e
      LEFT JOIN family_members fm ON e.family_member_id = fm.id
      WHERE e.user_id = ? AND e.expense_date BETWEEN ? AND ?
      ORDER BY e.id DESC
    `, [userId, startDate, endDate]);

    // Group expenses by date
    const dailyExpenses = {};
    for (let day = 1; day <= lastDayOfMonth; day++) {
      const dateStr = `${targetMonth}-${String(day).padStart(2, '0')}`;
      dailyExpenses[dateStr] = {
        date: dateStr,
        total: 0,
        count: 0,
        items: []
      };
    }

    expenses.forEach(e => {
      const d = e.expense_date instanceof Date 
        ? e.expense_date.toISOString().split('T')[0] 
        : String(e.expense_date).split('T')[0];
      
      if (dailyExpenses[d]) {
        dailyExpenses[d].total += parseFloat(e.amount);
        dailyExpenses[d].count += 1;
        dailyExpenses[d].items.push({
          id: e.id,
          description: e.description,
          amount: parseFloat(e.amount),
          category: e.category,
          mood: e.mood,
          family_member_name: e.family_member_name
        });
      }
    });

    // 2. Fetch all obligations & check payment status for this month
    const [obligations] = await pool.query(`
      SELECT o.id, o.name, o.category, o.amount, o.due_day, o.is_variable,
             CASE WHEN op.id IS NOT NULL THEN 1 ELSE 0 END as is_paid,
             op.paid_date
      FROM obligations o
      LEFT JOIN obligation_payments op 
        ON o.id = op.obligation_id 
        AND op.paid_date BETWEEN ? AND ?
      WHERE o.user_id = ? AND o.is_active = 1
      ORDER BY o.due_day ASC
    `, [startDate, endDate, userId]);

    // 3. Fetch active payday cycles in or overlapping this month
    const [paydayCycles] = await pool.query(`
      SELECT id, expected_amount, payday_date, next_payday_date, status
      FROM payday_cycles
      WHERE user_id = ? 
        AND (
          (payday_date BETWEEN ? AND ?) OR 
          (next_payday_date BETWEEN ? AND ?)
        )
      ORDER BY payday_date ASC
    `, [userId, startDate, endDate, startDate, endDate]);

    // 4. Calculate month summary metrics
    const monthTotalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const monthTotalBills = obligations.reduce((sum, o) => sum + parseFloat(o.amount), 0);
    const monthPaidBills = obligations.filter(o => o.is_paid).reduce((sum, o) => sum + parseFloat(o.amount), 0);

    res.json({
      success: true,
      month: targetMonth,
      year,
      monthNumber: mon,
      totalDays: lastDayOfMonth,
      summary: {
        totalExpenses: monthTotalExpenses,
        totalBills: monthTotalBills,
        paidBills: monthPaidBills,
        pendingBills: monthTotalBills - monthPaidBills,
        expenseCount: expenses.length,
        unpaidBillsCount: obligations.filter(o => !o.is_paid).length
      },
      dailyExpenses,
      obligations,
      paydayCycles
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
