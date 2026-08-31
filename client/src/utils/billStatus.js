/**
 * Calculates accurate due status for bills based on target due date and current day
 */
export function getBillDueStatus(dueDay, isPaid, language = 'en', ob = {}) {
  const isTL = language === 'tl';

  if (isPaid) {
    return {
      status: 'paid',
      label: isTL ? 'Bayad Na' : 'Paid',
      shortLabel: isTL ? 'Bayad Na' : 'Paid',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      isOverdue: false,
      isDueToday: false,
      isDueSoon: false,
      daysLate: 0,
      daysLeft: 0,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentDay = today.getDate();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const dDay = parseInt(dueDay, 10) || 15;

  let targetDate = null;

  if (ob.due_date) {
    targetDate = new Date(ob.due_date);
  } else if (ob.due_month && ob.due_year) {
    targetDate = new Date(ob.due_year, ob.due_month - 1, dDay);
  } else if (ob.due_month) {
    targetDate = new Date(currentYear, ob.due_month - 1, dDay);
  } else if (ob.created_at) {
    // If the obligation was created on or after its dueDay in the current month,
    // its very first due cycle is next month!
    const createdDate = new Date(ob.created_at);
    if (
      createdDate.getMonth() === today.getMonth() && 
      createdDate.getFullYear() === today.getFullYear() && 
      createdDate.getDate() > dDay
    ) {
      targetDate = new Date(currentYear, today.getMonth() + 1, dDay); // Next month
    } else {
      targetDate = new Date(currentYear, today.getMonth(), dDay);
    }
  } else if (dDay < currentDay) {
    // Fallback: if dDay is already past in current month and it's not a past due debt
    targetDate = new Date(currentYear, today.getMonth() + 1, dDay);
  } else {
    targetDate = new Date(currentYear, today.getMonth(), dDay);
  }

  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // If due date has passed in the past
  if (diffDays < 0) {
    const daysLate = Math.abs(diffDays);
    return {
      status: 'overdue',
      label: isTL ? `🚨 Lipas na nang ${daysLate} araw (Overdue)` : `🚨 Overdue (${daysLate} days late)`,
      shortLabel: isTL ? `Overdue (${daysLate}d)` : `Overdue (${daysLate}d)`,
      badgeClass: 'bg-rose-100 dark:bg-rose-950/90 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 animate-pulse font-black shadow-xs',
      isOverdue: true,
      isDueToday: false,
      isDueSoon: false,
      daysLate,
      daysLeft: 0,
    };
  }

  // If due date is today
  if (diffDays === 0) {
    return {
      status: 'due_today',
      label: isTL ? '⏰ Due Ngayong Araw!' : '⏰ Due Today!',
      shortLabel: isTL ? 'Due Ngayon!' : 'Due Today!',
      badgeClass: 'bg-amber-100 dark:bg-amber-950/90 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 font-black',
      isOverdue: false,
      isDueToday: true,
      isDueSoon: true,
      daysLate: 0,
      daysLeft: 0,
    };
  }

  // If due date is within next 3 days
  if (diffDays <= 3) {
    return {
      status: 'due_soon',
      label: isTL ? `⏳ Due sa loob ng ${diffDays} araw` : `⏳ Due in ${diffDays} days`,
      shortLabel: isTL ? `${diffDays}d na lang` : `In ${diffDays}d`,
      badgeClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-bold',
      isOverdue: false,
      isDueToday: false,
      isDueSoon: true,
      daysLate: 0,
      daysLeft: diffDays,
    };
  }

  // Next month / upcoming
  const targetMonthName = targetDate.toLocaleDateString(isTL ? 'tl-PH' : 'en-US', { month: 'short' });
  return {
    status: 'upcoming',
    label: isTL ? `Due sa ${targetMonthName} ${dDay} (${diffDays} araw)` : `Due on ${targetMonthName} ${dDay} (${diffDays}d left)`,
    shortLabel: isTL ? `${targetMonthName} ${dDay}` : `${targetMonthName} ${dDay}`,
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-medium',
    isOverdue: false,
    isDueToday: false,
    isDueSoon: false,
    daysLate: 0,
    daysLeft: diffDays,
  };
}
