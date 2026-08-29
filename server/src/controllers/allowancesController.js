import pool from '../config/db.js';
import { getActivePaydayCycle } from '../utils/calculator.js';

export async function getAllowances(req, res) {
  try {
    const userId = 1;
    const [members] = await pool.query('SELECT * FROM family_members WHERE user_id = ? ORDER BY id ASC', [userId]);
    const [allowances] = await pool.query(`
      SELECT a.*, fm.name as member_name, fm.role as member_role
      FROM allowances a
      JOIN family_members fm ON a.family_member_id = fm.id
      WHERE a.user_id = ?
      ORDER BY fm.name ASC
    `, [userId]);

    const activeCycle = await getActivePaydayCycle(userId);
    const totalAllocated = allowances.reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);

    res.json({
      success: true,
      allowances,
      familyMembers: members,
      totalAllocated,
      activeCycle
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function saveAllowance(req, res) {
  try {
    const userId = 1;
    const { id, family_member_id, amount, period = 'per-payday', notes = '' } = req.body;

    if (!family_member_id || !amount) {
      return res.status(400).json({ success: false, error: 'Family member and amount required' });
    }

    if (id) {
      await pool.query(
        'UPDATE allowances SET family_member_id = ?, amount = ?, period = ?, notes = ? WHERE id = ? AND user_id = ?',
        [family_member_id, amount, period, notes, id, userId]
      );
      res.json({ success: true, id });
    } else {
      const [result] = await pool.query(
        'INSERT INTO allowances (user_id, family_member_id, amount, period, notes) VALUES (?, ?, ?, ?, ?)',
        [userId, family_member_id, amount, period, notes]
      );
      res.json({ success: true, id: result.insertId });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function deleteAllowance(req, res) {
  try {
    const userId = 1;
    const { id } = req.params;
    await pool.query('DELETE FROM allowances WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function addFamilyMember(req, res) {
  try {
    const userId = 1;
    const { name, role = 'dependent' } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Name required' });

    const [result] = await pool.query(
      'INSERT INTO family_members (user_id, name, role) VALUES (?, ?, ?)',
      [userId, name, role]
    );
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function updateFamilyMember(req, res) {
  try {
    const userId = 1;
    const { id } = req.params;
    const { name, role } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Name required' });

    await pool.query(
      'UPDATE family_members SET name = ?, role = COALESCE(?, role) WHERE id = ? AND user_id = ?',
      [name, role || null, id, userId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function deleteFamilyMember(req, res) {
  try {
    const userId = 1;
    const { id } = req.params;
    await pool.query('DELETE FROM allowances WHERE family_member_id = ? AND user_id = ?', [id, userId]);
    await pool.query('DELETE FROM family_members WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
