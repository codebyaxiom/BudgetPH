import pool from '../config/db.js';
import { getActivePaydayCycle, getCycleBudgetMetrics } from './calculator.js';

export const aiToolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'record_payday',
      description: 'Activates or updates the user salary cut-off cycle when they receive their sahod/payday. Automatically sets up bill allocations and daily spendable capacity.',
      parameters: {
        type: 'object',
        properties: {
          received_amount: {
            type: 'number',
            description: 'The net take-home pay amount received in PHP (e.g. 20000)'
          },
          payday_date: {
            type: 'string',
            description: 'The date salary was received in YYYY-MM-DD format (defaults to today if not specified)'
          },
          next_payday_date: {
            type: 'string',
            description: 'Optional custom date for the next payday in YYYY-MM-DD format. If omitted, it is automatically computed based on user pay frequency.'
          }
        },
        required: ['received_amount']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_income_schedule',
      description: 'Updates the user pay frequency and schedule (e.g. changing from 15th & 30th semi-monthly to monthly, or weekly).',
      parameters: {
        type: 'object',
        properties: {
          frequency: {
            type: 'string',
            enum: ['semi_monthly', 'monthly', 'weekly', 'bi_weekly'],
            description: 'The pay frequency pattern'
          },
          pay_days: {
            type: 'string',
            description: 'Pay schedule description (e.g. "15,30", "25", or "every Friday")'
          },
          expected_amount: {
            type: 'number',
            description: 'Expected regular take-home pay amount per cut-off'
          }
        },
        required: ['frequency']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'log_expense',
      description: 'Logs a daily transaction, purchase, or spendable expense.',
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'Amount spent in PHP (e.g. 250)'
          },
          description: {
            type: 'string',
            description: 'What the expense was for (e.g. "Jollibee lunch", "Grab car", "Coffee")'
          },
          category: {
            type: 'string',
            enum: ['food', 'transport', 'groceries', 'utilities', 'medical', 'entertainment', 'other'],
            description: 'Expense category'
          },
          mood: {
            type: 'string',
            enum: ['need', 'want', 'regret'],
            description: 'Intention/mood tag for financial health tracking'
          },
          expense_date: {
            type: 'string',
            description: 'Expense date in YYYY-MM-DD format (defaults to today)'
          }
        },
        required: ['amount', 'description']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_obligation_or_debt',
      description: 'Adds a recurring monthly bill, loan, debt/utang owed to someone, or pautang lent to others.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the bill or person (e.g. "Meralco Electric Bill", "Utang kay Tito Jun", "Wifi")'
          },
          amount: {
            type: 'number',
            description: 'Amount of the obligation or bill in PHP'
          },
          due_day: {
            type: 'number',
            description: 'Day of the month it is due (1 to 31)'
          },
          category: {
            type: 'string',
            enum: ['electricity', 'water', 'rent', 'internet', 'loan', 'credit_card', 'insurance', 'subscription', 'other'],
            description: 'Category of the bill or debt'
          },
          notes: {
            type: 'string',
            description: 'Optional additional details or context'
          }
        },
        required: ['name', 'amount', 'due_day']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'mark_bill_paid',
      description: 'Marks an existing bill or obligation as paid for the current month/cycle.',
      parameters: {
        type: 'object',
        properties: {
          bill_name: {
            type: 'string',
            description: 'Name or keyword of the bill (e.g. "Meralco", "Internet", "Rent")'
          },
          amount_paid: {
            type: 'number',
            description: 'Amount paid in PHP (defaults to obligation amount if omitted)'
          }
        },
        required: ['bill_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'deposit_to_savings',
      description: 'Deposits money into an emergency fund or savings goal.',
      parameters: {
        type: 'object',
        properties: {
          goal_name: {
            type: 'string',
            description: 'Name or type of the goal (e.g. "Emergency Fund", "House Sinking Fund")'
          },
          amount: {
            type: 'number',
            description: 'Amount to deposit in PHP'
          }
        },
        required: ['amount']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_family_allowance',
      description: 'Adds a family member (e.g. child, spouse, parent) and assigns a recurring daily, weekly, or monthly allowance or baon to the budget.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the family member or dependent (e.g. "Grade 2 Kid", "Bunso", "Nanay")'
          },
          role: {
            type: 'string',
            description: 'Relationship or role (e.g. "child", "parent", "spouse", "sibling")'
          },
          amount: {
            type: 'number',
            description: 'Allowance amount in PHP'
          },
          period: {
            type: 'string',
            enum: ['daily', 'weekly', 'monthly'],
            description: 'How often the allowance is given (daily, weekly, or monthly)'
          },
          notes: {
            type: 'string',
            description: 'Purpose or details (e.g. "Baon and pamasahe Mon-Fri")'
          }
        },
        required: ['name', 'amount', 'period']
      }
    }
  }
];

export async function executeAiTool(name, args, userId = 1) {
  try {
    switch (name) {
      case 'record_payday': {
        const receivedAmount = parseFloat(args.received_amount);
        const todayStr = args.payday_date || new Date().toISOString().split('T')[0];

        // Fetch user pay schedule to compute next payday automatically if not passed
        const [incomeRows] = await pool.query('SELECT * FROM income_sources WHERE user_id = ? LIMIT 1', [userId]);
        const income = incomeRows[0] || {};
        const frequency = income.frequency || 'semi_monthly';

        let nextPaydayStr = args.next_payday_date;
        if (!nextPaydayStr) {
          const pDate = new Date(todayStr);
          const currentDay = pDate.getDate();
          const currentMonth = pDate.getMonth();
          const currentYear = pDate.getFullYear();

          if (frequency === 'semi_monthly') {
            if (currentDay <= 15) {
              // Next is end of current month (30th or last day)
              const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
              nextPaydayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(Math.min(30, lastDay)).padStart(2, '0')}`;
            } else {
              // Next is 15th of next month
              const nextMonthDate = new Date(currentYear, currentMonth + 1, 15);
              nextPaydayStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-15`;
            }
          } else if (frequency === 'weekly') {
            const nextWeek = new Date(pDate);
            nextWeek.setDate(pDate.getDate() + 7);
            nextPaydayStr = nextWeek.toISOString().split('T')[0];
          } else {
            // monthly: 1 month ahead
            const nextM = new Date(pDate);
            nextM.setMonth(pDate.getMonth() + 1);
            nextPaydayStr = nextM.toISOString().split('T')[0];
          }
        }

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        // Complete previous cycles
        await connection.query("UPDATE payday_cycles SET status = 'completed' WHERE user_id = ? AND status = 'active'", [userId]);

        // Insert new cycle
        const [cycleRes] = await connection.query(
          `INSERT INTO payday_cycles (user_id, income_source_id, payday_date, next_payday_date, expected_amount, actual_amount, status)
           VALUES (?, ?, ?, ?, ?, ?, 'active')`,
          [userId, income.id || null, todayStr, nextPaydayStr, receivedAmount, receivedAmount]
        );
        const cycleId = cycleRes.insertId;

        // Fetch active obligations to calculate budget
        const [obligations] = await connection.query('SELECT * FROM obligations WHERE user_id = ? AND is_active = 1', [userId]);
        let totalObligations = 0;
        for (const ob of obligations) {
          const amt = parseFloat(ob.amount || 0);
          totalObligations += amt;
          await connection.query(
            `INSERT INTO payday_allocations (payday_cycle_id, category, reference_id, label, amount)
             VALUES (?, 'obligation', ?, ?, ?)`,
            [cycleId, ob.id, ob.name, amt]
          );
        }

        // Allocate remaining to wants/daily
        const spendable = Math.max(0, receivedAmount - totalObligations);
        await connection.query(
          `INSERT INTO payday_allocations (payday_cycle_id, category, reference_id, label, amount)
           VALUES (?, 'wants', NULL, 'Daily Spendable & Wants', ?)`,
          [cycleId, spendable]
        );

        await connection.commit();
        connection.release();

        const metrics = await getCycleBudgetMetrics(userId);

        return {
          success: true,
          action_type: 'record_payday',
          summary: `Payday cycle of ₱${receivedAmount.toLocaleString()} activated. Next payday: ${nextPaydayStr}.`,
          data: {
            cycle_id: cycleId,
            received_amount: receivedAmount,
            next_payday: nextPaydayStr,
            days_until: metrics.days_until_payday,
            daily_budget: metrics.daily_budget,
            spendable_remaining: metrics.spendable_remaining,
            obligations_count: obligations.length
          }
        };
      }

      case 'update_income_schedule': {
        const { frequency, expected_amount } = args;
        const [rows] = await pool.query('SELECT id FROM income_sources WHERE user_id = ? LIMIT 1', [userId]);
        if (rows.length > 0) {
          await pool.query(
            `UPDATE income_sources SET frequency = ?, amount = COALESCE(?, amount) WHERE id = ?`,
            [frequency, expected_amount || null, rows[0].id]
          );
        } else {
          await pool.query(
            `INSERT INTO income_sources (user_id, name, amount, frequency, is_active)
             VALUES (?, 'Primary Income', ?, ?, 1)`,
            [userId, expected_amount || 20000, frequency]
          );
        }

        return {
          success: true,
          action_type: 'update_income_schedule',
          summary: `Pay schedule updated to ${frequency}.`,
          data: { frequency, expected_amount }
        };
      }

      case 'log_expense': {
        const amount = parseFloat(args.amount);
        const description = args.description;
        const category = args.category || 'food';
        const mood = args.mood || 'need';
        const expenseDate = args.expense_date || new Date().toISOString().split('T')[0];

        const activeCycle = await getActivePaydayCycle(userId);

        const [res] = await pool.query(
          `INSERT INTO expenses (user_id, payday_cycle_id, category, amount, description, mood, expense_date)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [userId, activeCycle?.id || null, category, amount, description, mood, expenseDate]
        );

        const metrics = await getCycleBudgetMetrics(userId);

        return {
          success: true,
          action_type: 'log_expense',
          summary: `Logged expense: ${description} (₱${amount.toLocaleString()}) - ${category.toUpperCase()} [${mood.toUpperCase()}]`,
          data: {
            expense_id: res.insertId,
            amount,
            description,
            category,
            mood,
            remaining_today: metrics.remaining_today,
            daily_budget: metrics.daily_budget
          }
        };
      }

      case 'add_obligation_or_debt': {
        const name = args.name;
        const amount = parseFloat(args.amount);
        const dueDay = parseInt(args.due_day, 10) || 15;
        const validCategories = ['electricity','water','internet','rent','loan','credit_card','insurance','subscriptions','school','other'];
        const category = validCategories.includes(args.category) ? args.category : 'loan';
        const notes = args.notes || '';

        const [res] = await pool.query(
          `INSERT INTO obligations (user_id, name, amount, category, due_day, cutoff_assignment, is_variable, is_active, notes)
           VALUES (?, ?, ?, ?, ?, 'auto', 0, 1, ?)`,
          [userId, name, amount, category, dueDay, notes]
        );

        return {
          success: true,
          action_type: 'add_obligation_or_debt',
          summary: `Added obligation: ${name} (₱${amount.toLocaleString()}) due every ${dueDay}th.`,
          data: {
            obligation_id: res.insertId,
            name,
            amount,
            due_day: dueDay,
            category
          }
        };
      }

      case 'mark_bill_paid': {
        const rawBill = (args.bill_name || '').toLowerCase().trim();
        const amountPaid = parseFloat(args.amount_paid || 0);
        const todayStr = new Date().toISOString().split('T')[0];

        // Keyword synonym mapping for Pinoy utilities & bills
        let searchTerms = [rawBill];
        let detectedCategory = 'other';

        if (rawBill.includes('kuryente') || rawBill.includes('electric') || rawBill.includes('meralco')) {
          searchTerms = ['kuryente', 'electric', 'meralco', 'power'];
          detectedCategory = 'electricity';
        } else if (rawBill.includes('tubig') || rawBill.includes('water') || rawBill.includes('maynilad') || rawBill.includes('manila water')) {
          searchTerms = ['tubig', 'water', 'maynilad', 'manila water'];
          detectedCategory = 'water';
        } else if (rawBill.includes('internet') || rawBill.includes('wifi') || rawBill.includes('pldt') || rawBill.includes('converge') || rawBill.includes('globe')) {
          searchTerms = ['internet', 'wifi', 'pldt', 'converge', 'globe'];
          detectedCategory = 'internet';
        } else if (rawBill.includes('rent') || rawBill.includes('upa') || rawBill.includes('apartment')) {
          searchTerms = ['rent', 'upa', 'apartment', 'house'];
          detectedCategory = 'rent';
        } else if (rawBill.includes('utang') || rawBill.includes('loan') || rawBill.includes('credit')) {
          searchTerms = ['utang', 'loan', 'credit', rawBill];
          detectedCategory = 'loan';
        }

        // Search in obligations
        const [allObs] = await pool.query(
          `SELECT * FROM obligations WHERE user_id = ? AND is_active = 1`,
          [userId]
        );

        let target = allObs.find(o => {
          const oName = o.name.toLowerCase();
          return searchTerms.some(term => oName.includes(term) || term.includes(oName));
        });

        // If no bill exists yet with this name, auto-create it seamlessly
        if (!target) {
          const finalName = args.bill_name.charAt(0).toUpperCase() + args.bill_name.slice(1);
          const finalAmt = amountPaid > 0 ? amountPaid : 1500;
          const [createRes] = await pool.query(
            `INSERT INTO obligations (user_id, name, amount, category, due_day, cutoff_assignment, is_variable, is_active, notes)
             VALUES (?, ?, ?, ?, 15, 'auto', 0, 1, 'Auto-created via AI Assistant')`,
            [userId, finalName, finalAmt, detectedCategory]
          );
          target = {
            id: createRes.insertId,
            name: finalName,
            amount: finalAmt
          };
        }

        const finalPaymentAmt = amountPaid > 0 ? amountPaid : target.amount;

        // Record payment
        await pool.query(
          `INSERT INTO obligation_payments (obligation_id, user_id, amount_paid, paid_date, notes)
           VALUES (?, ?, ?, ?, ?)`,
          [target.id, userId, finalPaymentAmt, todayStr, 'Marked paid via BudgetPH AI Co-Pilot']
        );

        return {
          success: true,
          action_type: 'mark_bill_paid',
          summary: `Marked "${target.name}" (₱${finalPaymentAmt.toLocaleString()}) as paid!`,
          data: {
            obligation_id: target.id,
            name: target.name,
            amount_paid: finalPaymentAmt,
            paid_date: todayStr
          }
        };
      }

      case 'deposit_to_savings': {
        const amount = parseFloat(args.amount);
        const goalQuery = args.goal_name ? args.goal_name.toLowerCase() : 'emergency';

        const [goals] = await pool.query(
          `SELECT * FROM savings_goals WHERE user_id = ? AND is_active = 1 AND (LOWER(name) LIKE ? OR type LIKE ?) LIMIT 1`,
          [userId, `%${goalQuery}%`, `%${goalQuery}%`]
        );

        let targetGoal = goals[0];
        if (!targetGoal) {
          // Fallback to first available or create emergency fund
          const [allGoals] = await pool.query('SELECT * FROM savings_goals WHERE user_id = ? AND is_active = 1 LIMIT 1', [userId]);
          targetGoal = allGoals[0];
        }

        if (!targetGoal) {
          // Create emergency fund goal
          const [newG] = await pool.query(
            `INSERT INTO savings_goals (user_id, name, type, target_amount, current_amount, is_active)
             VALUES (?, 'Emergency Fund', 'emergency_fund', 60000, ?, 1)`,
            [userId, amount]
          );
          targetGoal = { id: newG.insertId, name: 'Emergency Fund', current_amount: amount, target_amount: 60000 };
        } else {
          await pool.query(
            'UPDATE savings_goals SET current_amount = current_amount + ? WHERE id = ?',
            [amount, targetGoal.id]
          );
          targetGoal.current_amount = parseFloat(targetGoal.current_amount || 0) + amount;
        }

        return {
          success: true,
          action_type: 'deposit_to_savings',
          summary: `Deposited ₱${amount.toLocaleString()} into "${targetGoal.name}". New total: ₱${targetGoal.current_amount.toLocaleString()}.`,
          data: {
            goal_id: targetGoal.id,
            name: targetGoal.name,
            deposited: amount,
            current_total: targetGoal.current_amount,
            target_amount: targetGoal.target_amount
          }
        };
      }

      case 'add_family_allowance': {
        const { name, role = 'child', amount, period = 'weekly', notes = '' } = args;
        const numAmt = parseFloat(amount);

        // Find or create family member
        const [existing] = await pool.query(
          'SELECT id FROM family_members WHERE user_id = ? AND LOWER(name) = LOWER(?) LIMIT 1',
          [userId, name]
        );

        let memberId;
        if (existing.length > 0) {
          memberId = existing[0].id;
        } else {
          const [ins] = await pool.query(
            'INSERT INTO family_members (user_id, name, role, notes) VALUES (?, ?, ?, ?)',
            [userId, name, role, notes]
          );
          memberId = ins.insertId;
        }

        // Insert allowance
        const [allowanceRes] = await pool.query(
          'INSERT INTO allowances (user_id, family_member_id, amount, period, notes) VALUES (?, ?, ?, ?, ?)',
          [userId, memberId, numAmt, period, notes]
        );

        return {
          success: true,
          action_type: 'add_family_allowance',
          summary: `Added allowance for ${name}: ₱${numAmt.toLocaleString()} (${period}).`,
          data: {
            allowance_id: allowanceRes.insertId,
            member_id: memberId,
            name,
            role,
            amount: numAmt,
            period,
            notes
          }
        };
      }

      default:
        return { success: false, summary: `Unknown tool: ${name}` };
    }
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    return { success: false, error: error.message };
  }
}
