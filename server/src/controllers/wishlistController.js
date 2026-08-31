import pool from '../config/db.js';
import { getCycleBudgetMetrics } from '../utils/calculator.js';

export async function getWishlist(req, res) {
  try {
    const userId = 1;
    const [items] = await pool.query(
      `SELECT * FROM wishlist_items WHERE user_id = ? ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END, created_at DESC`,
      [userId]
    );

    const pendingItems = items.filter(i => i.status === 'pending');
    const totalPendingCost = pendingItems.reduce((acc, i) => acc + parseFloat(i.estimated_amount || 0), 0);

    const metrics = await getCycleBudgetMetrics(userId);

    // Calculate which items are affordable given spendable buffer
    let runningTotal = 0;
    const itemsWithAffordability = items.map(item => {
      if (item.status !== 'pending') return item;
      const amt = parseFloat(item.estimated_amount);
      const isAffordableNow = (runningTotal + amt) <= metrics.spendable_remaining;
      if (isAffordableNow) {
        runningTotal += amt;
      }
      return {
        ...item,
        is_affordable_in_cycle: isAffordableNow
      };
    });

    res.json({
      success: true,
      items: itemsWithAffordability,
      summary: {
        total_items: items.length,
        pending_count: pendingItems.length,
        total_pending_cost: totalPendingCost,
        current_spendable_remaining: metrics.spendable_remaining
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function addWishlistItem(req, res) {
  try {
    const userId = 1;
    const { name, estimated_amount, priority = 'medium', notes = '' } = req.body;
    if (!name || !estimated_amount) {
      return res.status(400).json({ success: false, error: 'Name and estimated amount are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO wishlist_items (user_id, name, estimated_amount, priority, status, notes)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
      [userId, name, parseFloat(estimated_amount), priority, notes]
    );

    res.json({
      success: true,
      item_id: result.insertId,
      message: 'Wishlist item added successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function markWishlistPurchased(req, res) {
  try {
    const userId = 1;
    const { id } = req.params;
    const { log_as_expense = true } = req.body;
    const todayStr = new Date().toISOString().split('T')[0];

    const [items] = await pool.query('SELECT * FROM wishlist_items WHERE id = ? AND user_id = ?', [id, userId]);
    if (items.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    const item = items[0];

    await pool.query(
      `UPDATE wishlist_items SET status = 'purchased', purchased_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );

    if (log_as_expense) {
      // Find active cycle
      const [cycles] = await pool.query("SELECT id FROM payday_cycles WHERE user_id = ? AND status = 'active' LIMIT 1", [userId]);
      const cycleId = cycles[0]?.id || null;

      await pool.query(
        `INSERT INTO expenses (user_id, payday_cycle_id, amount, description, category, mood, expense_date)
         VALUES (?, ?, ?, ?, 'entertainment', 'want', ?)`,
        [userId, cycleId, item.estimated_amount, `Wishlist: ${item.name}`, todayStr]
      );
    }

    res.json({
      success: true,
      message: `Marked "${item.name}" as purchased!`,
      item
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function deleteWishlistItem(req, res) {
  try {
    const userId = 1;
    const { id } = req.params;
    await pool.query('DELETE FROM wishlist_items WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ success: true, message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
