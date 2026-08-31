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
      description: 'Adds a recurring monthly bill, loan, installment debt/utang owed to someone, or pautang lent to others. If due_day is not specified by the user, immediately call this function with due_day=15.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the bill, person, or creditor (e.g. "Meralco Electric Bill", "Utang kay Aunt Maria", "SSS Loan", "Wifi")'
          },
          amount: {
            type: 'number',
            description: 'Monthly amount of the obligation or installment payment in PHP'
          },
          due_day: {
            type: 'number',
            description: 'Day of the month it is due (1 to 31). If omitted, default to 15.'
          },
          category: {
            type: 'string',
            enum: ['electricity', 'water', 'rent', 'internet', 'loan', 'credit_card', 'insurance', 'subscription', 'other'],
            description: 'Category of the bill or debt'
          },
          is_installment: {
            type: 'boolean',
            description: 'True if this is a fixed-term debt or installment with a target completion date'
          },
          end_month: {
            type: 'number',
            description: 'Target end month number (1 to 12, e.g. 12 for December) when the debt/bill will be completely paid off'
          },
          end_year: {
            type: 'number',
            description: 'Target end year (e.g. 2026)'
          },
          is_variable: {
            type: 'boolean',
            description: 'True if amount changes every month (e.g. Electricity, Water)'
          },
          notes: {
            type: 'string',
            description: 'Optional additional details or context'
          }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_obligation',
      description: 'Updates, edits, or adjusts an existing bill, variable utility (electricity/water), or installment debt (e.g. modify amount, due day, end month/year, or toggle variable status).',
      parameters: {
        type: 'object',
        properties: {
          bill_name: {
            type: 'string',
            description: 'Name or keyword of the bill or debt to edit (e.g. "Electricity", "Meralco", "Utang Aunt Maria")'
          },
          new_name: {
            type: 'string',
            description: 'Optional new name for the bill'
          },
          amount: {
            type: 'number',
            description: 'New monthly or estimated amount in PHP'
          },
          due_day: {
            type: 'number',
            description: 'New due day of the month (1 to 31)'
          },
          category: {
            type: 'string',
            enum: ['electricity', 'water', 'rent', 'internet', 'loan', 'credit_card', 'insurance', 'subscription', 'other']
          },
          is_variable: {
            type: 'boolean',
            description: 'True if amount fluctuates every month (e.g. electricity, water)'
          },
          is_installment: {
            type: 'boolean',
            description: 'True if fixed-term installment debt'
          },
          end_month: {
            type: 'number',
            description: 'New target end month (1 to 12)'
          },
          end_year: {
            type: 'number',
            description: 'New target end year (e.g. 2026)'
          }
        },
        required: ['bill_name']
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
            description: 'Real name or Filipino familial nickname of the dependent (e.g. "Lucas", "Sofia", "Bunso", "Panganay", "Nanay", "Tatay")'
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
            description: 'Purpose or details (e.g. "School baon Mon-Fri")'
          }
        },
        required: ['name', 'amount', 'period']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_family_member_name',
      description: 'Renames or updates an existing family member or dependent (e.g. changing "Grade 2 Kid" to a real name like "Lucas", "Sofia", or "Bunso").',
      parameters: {
        type: 'object',
        properties: {
          current_name: {
            type: 'string',
            description: 'Current name or keyword of the family member to find (e.g. "Grade 2 Kid", "Bunso")'
          },
          new_name: {
            type: 'string',
            description: 'The new preferred real name or nickname (e.g. "Lucas", "Sofia", "Bunso", "Kuya Miggy")'
          },
          role: {
            type: 'string',
            description: 'Optional updated relationship/role (e.g. "child", "spouse", "parent")'
          }
        },
        required: ['current_name', 'new_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_family_member',
      description: 'Deletes or removes a family member and their associated allowance from the budget (e.g. "Alisin si Lucas", "Delete member Farzam").',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name or keyword of the family member to delete/remove'
          }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_to_wishlist',
      description: 'Saves a non-essential want, impulse purchase, or item to the Wants/Wishlist delay buffer to review on payday.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the item or want (e.g. "Nike Air Max", "Mechanical Keyboard", "Steam Game")'
          },
          estimated_amount: {
            type: 'number',
            description: 'Estimated price/cost in PHP'
          },
          priority: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
            description: 'Priority level (high, medium, or low)'
          },
          notes: {
            type: 'string',
            description: 'Why you want it or any special notes'
          }
        },
        required: ['name', 'estimated_amount']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'evaluate_wants_affordability',
      description: 'Evaluates all pending items in the user Wants & Wishlist buffer against their current cycle spendable surplus, bills, and days until next payday, returning which items they can safely buy now vs. wait.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'buy_wishlist_item',
      description: 'Marks a saved wishlist item as purchased and automatically logs it as a daily expense.',
      parameters: {
        type: 'object',
        properties: {
          item_name: {
            type: 'string',
            description: 'Name or keyword of the wishlist item to mark purchased'
          }
        },
        required: ['item_name']
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
        const dueDay = parseInt(args.due_day, 10) || 15;
        const validCategories = ['electricity','water','internet','rent','loan','credit_card','insurance','subscriptions','school','other'];
        const category = validCategories.includes(args.category) ? args.category : (name.toLowerCase().includes('kuryente') || name.toLowerCase().includes('meralco') ? 'electricity' : (name.toLowerCase().includes('tubig') || name.toLowerCase().includes('maynilad') ? 'water' : 'loan'));
        const notes = args.notes || '';

        // Smart prediction for variable utilities if amount is omitted
        let amount = parseFloat(args.amount);
        let isEstimated = false;
        if (isNaN(amount) || amount <= 0) {
          isEstimated = true;
          const [pastPayments] = await pool.query(
            `SELECT op.amount_paid 
             FROM obligation_payments op 
             JOIN obligations o ON op.obligation_id = o.id 
             WHERE o.user_id = ? AND o.category = ? 
             ORDER BY op.paid_date DESC LIMIT 1`,
            [userId, category]
          );
          if (pastPayments.length > 0 && pastPayments[0].amount_paid) {
            amount = parseFloat(pastPayments[0].amount_paid);
          } else if (category === 'electricity' || name.toLowerCase().includes('kuryente') || name.toLowerCase().includes('meralco')) {
            amount = 1500;
          } else if (category === 'water' || name.toLowerCase().includes('tubig') || name.toLowerCase().includes('maynilad')) {
            amount = 450;
          } else if (category === 'internet' || name.toLowerCase().includes('wifi')) {
            amount = 1500;
          } else {
            amount = 1000;
          }
        }

        const isVariable = args.is_variable !== undefined 
          ? (args.is_variable ? 1 : 0) 
          : (category === 'electricity' || category === 'water' || name.toLowerCase().includes('kuryente') || name.toLowerCase().includes('tubig') ? 1 : 0);

        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        const isLoanOrUtang = category === 'loan' || (name && name.toLowerCase().includes('utang'));
        let isInstallment = (args.is_installment || isLoanOrUtang) ? 1 : 0;
        let endMonth = args.end_month ? parseInt(args.end_month, 10) : (isInstallment ? 12 : null);
        let endYear = args.end_year ? parseInt(args.end_year, 10) : currentYear;
        let totalAmount = args.total_amount ? parseFloat(args.total_amount) : null;
        let remainingBalance = null;

        if (endMonth) {
          isInstallment = 1;
          if (endMonth < currentMonth && !args.end_year) {
            endYear = currentYear + 1;
          }
          const totalMonths = Math.max(1, (endYear - currentYear) * 12 + (endMonth - currentMonth) + 1);
          if (!totalAmount) {
            totalAmount = totalMonths * amount;
          }
          remainingBalance = totalAmount;
        } else if (totalAmount) {
          isInstallment = 1;
          remainingBalance = totalAmount;
          const months = Math.ceil(totalAmount / amount);
          let targetM = currentMonth + months - 1;
          let targetY = currentYear;
          while (targetM > 12) {
            targetM -= 12;
            targetY += 1;
          }
          endMonth = targetM;
          endYear = targetY;
        }

        const [res] = await pool.query(
          `INSERT INTO obligations (
            user_id, name, amount, category, due_day, cutoff_assignment, is_variable, is_active, notes,
            is_installment, total_amount, remaining_balance, monthly_amount, end_month, end_year, status
          )
          VALUES (?, ?, ?, ?, ?, 'auto', ?, 1, ?, ?, ?, ?, ?, ?, ?, 'active')`,
          [
            userId, name, amount, category, dueDay, isVariable, notes,
            isInstallment, totalAmount, remainingBalance, amount, endMonth, endYear
          ]
        );

        return {
          success: true,
          action_type: 'add_obligation_or_debt',
          summary: isInstallment
            ? `Added installment debt: ${name} (₱${amount.toLocaleString()}/mo until ${endMonth}/${endYear}).`
            : isVariable
              ? `Added variable utility: ${name} (Estimated ₱${amount.toLocaleString()}/mo based on previous bills).`
              : `Added obligation: ${name} (₱${amount.toLocaleString()}) due every ${dueDay}th.`,
          data: {
            obligation_id: res.insertId,
            name,
            amount,
            due_day: dueDay,
            category,
            is_variable: Boolean(isVariable),
            is_estimated: isEstimated,
            is_installment: Boolean(isInstallment),
            end_month: endMonth,
            end_year: endYear,
            total_amount: totalAmount,
            remaining_balance: remainingBalance
          }
        };
      }

      case 'update_obligation': {
        const rawBill = (args.bill_name || '').toLowerCase().trim();
        const [allObs] = await pool.query(
          `SELECT * FROM obligations WHERE user_id = ? AND is_active = 1`,
          [userId]
        );

        let target = allObs.find(o => {
          const oName = o.name.toLowerCase();
          return oName.includes(rawBill) || rawBill.includes(oName);
        });

        if (!target) {
          return {
            success: false,
            action_type: 'update_obligation',
            summary: `Could not find an active bill or debt matching "${args.bill_name}".`,
            data: { bill_name: args.bill_name }
          };
        }

        const newName = args.new_name || target.name;
        const newAmount = args.amount !== undefined ? parseFloat(args.amount) : parseFloat(target.amount);
        const newDueDay = args.due_day !== undefined ? parseInt(args.due_day, 10) : target.due_day;
        const newCategory = args.category || target.category;
        const newIsVariable = args.is_variable !== undefined ? (args.is_variable ? 1 : 0) : target.is_variable;
        const newIsInstallment = args.is_installment !== undefined ? (args.is_installment ? 1 : 0) : target.is_installment;
        const newEndMonth = args.end_month !== undefined ? parseInt(args.end_month, 10) : target.end_month;
        const newEndYear = args.end_year !== undefined ? parseInt(args.end_year, 10) : (target.end_year || new Date().getFullYear());

        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        let totalAmount = target.total_amount;
        let remainingBalance = target.remaining_balance;

        if (newIsInstallment && newEndMonth) {
          const totalMonths = Math.max(1, (newEndYear - currentYear) * 12 + (newEndMonth - currentMonth) + 1);
          totalAmount = totalMonths * newAmount;
          remainingBalance = totalAmount;
        }

        await pool.query(
          `UPDATE obligations
           SET name = ?, amount = ?, due_day = ?, category = ?, is_variable = ?, is_installment = ?,
               end_month = ?, end_year = ?, total_amount = ?, remaining_balance = ?, monthly_amount = ?
           WHERE id = ? AND user_id = ?`,
          [
            newName, newAmount, newDueDay, newCategory, newIsVariable, newIsInstallment,
            newEndMonth, newEndYear, totalAmount, remainingBalance, newAmount,
            target.id, userId
          ]
        );

        return {
          success: true,
          action_type: 'update_obligation',
          summary: `Updated bill "${newName}" (₱${newAmount.toLocaleString()}, Due ${newDueDay}th).`,
          data: {
            obligation_id: target.id,
            name: newName,
            amount: newAmount,
            due_day: newDueDay,
            category: newCategory,
            is_variable: Boolean(newIsVariable),
            is_installment: Boolean(newIsInstallment),
            end_month: newEndMonth,
            end_year: newEndYear
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
          const finalName = args.bill_name ? (args.bill_name.charAt(0).toUpperCase() + args.bill_name.slice(1)) : 'Obligation';
          const finalAmt = amountPaid > 0 ? amountPaid : 1500;
          const [createRes] = await pool.query(
            `INSERT INTO obligations (user_id, name, amount, category, due_day, cutoff_assignment, is_variable, is_active, notes)
             VALUES (?, ?, ?, ?, 15, 'auto', 0, 1, 'Auto-created via AI Assistant')`,
            [userId, finalName, finalAmt, detectedCategory]
          );
          target = {
            id: createRes.insertId,
            name: finalName,
            amount: finalAmt,
            is_installment: 0
          };
        }

        const monthlyAmt = parseFloat(target.monthly_amount || target.amount);
        const finalPaymentAmt = amountPaid > 0 ? amountPaid : monthlyAmt;
        const monthsCovered = monthlyAmt > 0 ? Math.max(1, Math.round(finalPaymentAmt / monthlyAmt)) : 1;

        let newBalance = target.remaining_balance !== null ? Math.max(0, parseFloat(target.remaining_balance) - finalPaymentAmt) : null;
        let newEndMonth = target.end_month;
        let newEndYear = target.end_year;
        let newStatus = target.status || 'active';
        let newIsActive = target.is_active;

        // Advance payment shifting logic:
        if (target.is_installment && target.end_month && target.end_year && monthsCovered > 1) {
          const extraMonths = monthsCovered - 1;
          newEndMonth -= extraMonths;
          while (newEndMonth < 1) {
            newEndMonth += 12;
            newEndYear -= 1;
          }
        }

        // Auto-complete if balance is 0 or end date reached
        if (target.is_installment && (newBalance === 0 || (newEndMonth && newEndYear && (newEndYear < new Date().getFullYear() || (newEndYear === new Date().getFullYear() && newEndMonth < new Date().getMonth() + 1))))) {
          newStatus = 'completed';
          newIsActive = 0;
        }

        // Record payment
        await pool.query(
          `INSERT INTO obligation_payments (obligation_id, user_id, amount_paid, paid_date, months_covered, is_advance, balance_after, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [target.id, userId, finalPaymentAmt, todayStr, monthsCovered, monthsCovered > 1 ? 1 : 0, newBalance, 'Paid via BudgetPH AI Co-Pilot']
        );

        if (target.is_installment) {
          await pool.query(
            `UPDATE obligations
             SET remaining_balance = ?, end_month = ?, end_year = ?, status = ?, is_active = ?, paid_months_count = COALESCE(paid_months_count, 0) + ?
             WHERE id = ? AND user_id = ?`,
            [newBalance, newEndMonth, newEndYear, newStatus, newIsActive, monthsCovered, target.id, userId]
          );
        }

        return {
          success: true,
          action_type: 'mark_bill_paid',
          summary: newStatus === 'completed'
            ? `🎉 Fully Paid! "${target.name}" is now completely settled!`
            : monthsCovered > 1
              ? `Paid ₱${finalPaymentAmt.toLocaleString()} (${monthsCovered} months advance) for "${target.name}". End date moved to ${newEndMonth}/${newEndYear}!`
              : `Marked "${target.name}" (₱${finalPaymentAmt.toLocaleString()}) as paid!`,
          data: {
            obligation_id: target.id,
            name: target.name,
            amount_paid: finalPaymentAmt,
            paid_date: todayStr,
            months_covered: monthsCovered,
            remaining_balance: newBalance,
            new_end_month: newEndMonth,
            new_end_year: newEndYear,
            is_completed: newStatus === 'completed'
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

      case 'update_family_member_name': {
        const rawCurrent = (args.current_name || '').toLowerCase().trim();
        const newName = (args.new_name || '').trim();
        const newRole = args.role;

        const [members] = await pool.query('SELECT * FROM family_members WHERE user_id = ?', [userId]);
        if (members.length === 0) {
          return {
            success: false,
            action_type: 'update_family_member_name',
            summary: 'Walang nakarehistrong family member sa kasalukuyan.'
          };
        }

        const terms = rawCurrent.split(/[\s()\-]+/).filter(Boolean);
        let target = members.find(m => {
          const mLow = m.name.toLowerCase();
          return mLow === rawCurrent || mLow.includes(rawCurrent) || rawCurrent.includes(mLow) || terms.some(t => mLow.includes(t));
        });

        // Fallback if only 1 family member exists
        if (!target && members.length === 1) {
          target = members[0];
        }

        if (!target) {
          return {
            success: false,
            action_type: 'update_family_member_name',
            summary: `Hindi mahanap ang family member na "${args.current_name}".`
          };
        }

        await pool.query(
          'UPDATE family_members SET name = ?, role = COALESCE(?, role) WHERE id = ? AND user_id = ?',
          [newName, newRole || null, target.id, userId]
        );

        return {
          success: true,
          action_type: 'update_family_member_name',
          summary: `Na-update na ang pangalan ni "${target.name}" sa "${newName}"!`,
          data: {
            member_id: target.id,
            old_name: target.name,
            new_name: newName,
            role: newRole || target.role
          }
        };
      }

      case 'delete_family_member': {
        const rawName = (args.name || '').toLowerCase().trim();
        const [members] = await pool.query('SELECT * FROM family_members WHERE user_id = ?', [userId]);

        if (members.length === 0) {
          return {
            success: false,
            action_type: 'delete_family_member',
            summary: 'Walang nakarehistrong family member sa kasalukuyan.'
          };
        }

        const terms = rawName.split(/[\s()\-]+/).filter(Boolean);
        let target = members.find(m => {
          const mLow = m.name.toLowerCase();
          return mLow === rawName || mLow.includes(rawName) || rawName.includes(mLow) || terms.some(t => mLow.includes(t));
        });

        if (!target && members.length === 1) {
          target = members[0];
        }

        if (!target) {
          return {
            success: false,
            action_type: 'delete_family_member',
            summary: `Hindi mahanap ang family member na "${args.name}".`
          };
        }

        // Delete associated allowances first
        await pool.query('DELETE FROM allowances WHERE family_member_id = ? AND user_id = ?', [target.id, userId]);
        // Delete member
        await pool.query('DELETE FROM family_members WHERE id = ? AND user_id = ?', [target.id, userId]);

        return {
          success: true,
          action_type: 'delete_family_member',
          summary: `Matagumpay na tinanggal si "${target.name}" at ang kanyang allowance sa iyong budget.`,
          data: {
            deleted_member_id: target.id,
            name: target.name
          }
        };
      }

      case 'add_to_wishlist': {
        const { name, estimated_amount, priority = 'medium', notes = '' } = args;
        const numAmt = parseFloat(estimated_amount);

        const [ins] = await pool.query(
          `INSERT INTO wishlist_items (user_id, name, estimated_amount, priority, status, notes)
           VALUES (?, ?, ?, ?, 'pending', ?)`,
          [userId, name, numAmt, priority, notes]
        );

        return {
          success: true,
          action_type: 'add_to_wishlist',
          summary: `Added "${name}" (₱${numAmt.toLocaleString()}) [${priority.toUpperCase()} priority] to your Wants & Wishlist buffer.`,
          data: {
            wishlist_id: ins.insertId,
            name,
            estimated_amount: numAmt,
            priority,
            notes
          }
        };
      }

      case 'evaluate_wants_affordability': {
        const metrics = await getCycleBudgetMetrics(userId);
        const [items] = await pool.query(
          `SELECT * FROM wishlist_items WHERE user_id = ? AND status = 'pending' ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END, estimated_amount ASC`,
          [userId]
        );

        let spendablePool = metrics.spendable_remaining;
        const affordableItems = [];
        const waitItems = [];

        for (const item of items) {
          const cost = parseFloat(item.estimated_amount);
          if (cost <= spendablePool) {
            affordableItems.push({ ...item, cost });
            spendablePool -= cost;
          } else {
            waitItems.push({ ...item, cost });
          }
        }

        return {
          success: true,
          action_type: 'evaluate_wants_affordability',
          summary: `Evaluated ${items.length} wishlist items. ${affordableItems.length} affordable now, ${waitItems.length} recommended to wait.`,
          data: {
            spendable_remaining: metrics.spendable_remaining,
            daily_budget: metrics.daily_budget,
            days_until_payday: metrics.days_until_payday,
            affordable_items: affordableItems,
            wait_items: waitItems,
            total_pending: items.length
          }
        };
      }

      case 'buy_wishlist_item': {
        const queryName = (args.item_name || '').toLowerCase().trim();
        const todayStr = new Date().toISOString().split('T')[0];

        const [items] = await pool.query(
          `SELECT * FROM wishlist_items WHERE user_id = ? AND status = 'pending' AND LOWER(name) LIKE ? LIMIT 1`,
          [userId, `%${queryName}%`]
        );

        if (items.length === 0) {
          return {
            success: false,
            action_type: 'buy_wishlist_item',
            summary: `No pending wishlist item found matching "${args.item_name}".`
          };
        }

        const target = items[0];
        await pool.query(
          `UPDATE wishlist_items SET status = 'purchased', purchased_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [target.id]
        );

        // Find active cycle and log expense
        const [cycles] = await pool.query("SELECT id FROM payday_cycles WHERE user_id = ? AND status = 'active' LIMIT 1", [userId]);
        const cycleId = cycles[0]?.id || null;

        await pool.query(
          `INSERT INTO expenses (user_id, payday_cycle_id, amount, description, category, mood, expense_date)
           VALUES (?, ?, ?, ?, 'entertainment', 'want', ?)`,
          [userId, cycleId, target.estimated_amount, `Wishlist: ${target.name}`, todayStr]
        );

        const updatedMetrics = await getCycleBudgetMetrics(userId);

        return {
          success: true,
          action_type: 'buy_wishlist_item',
          summary: `Marked "${target.name}" (₱${parseFloat(target.estimated_amount).toLocaleString()}) as purchased and logged under Wants!`,
          data: {
            wishlist_id: target.id,
            name: target.name,
            amount: parseFloat(target.estimated_amount),
            remaining_today: updatedMetrics.remaining_today
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
