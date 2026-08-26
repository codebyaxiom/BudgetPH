// dashboardController.js
import { getUserFinancialSnapshot } from '../utils/calculator.js';

export async function getDashboard(req, res) {
  try {
    const userId = 1;
    const data = await getUserFinancialSnapshot(userId);
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('getDashboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
