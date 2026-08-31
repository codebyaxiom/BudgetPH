/**
 * Calculates accurate due status for bills based on current day of month
 */
export function getBillDueStatus(dueDay, isPaid, language = 'en') {
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
  const currentDay = today.getDate();

  // If due day has passed in the current month, it's overdue
  if (dueDay < currentDay) {
    const daysLate = currentDay - dueDay;
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

  // If due day is today
  if (dueDay === currentDay) {
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

  // If due day is within the next 3 days
  const daysLeft = dueDay - currentDay;
  if (daysLeft <= 3) {
    return {
      status: 'due_soon',
      label: isTL ? `⏳ Due sa loob ng ${daysLeft} araw` : `⏳ Due in ${daysLeft} days`,
      shortLabel: isTL ? `${daysLeft}d na lang` : `In ${daysLeft}d`,
      badgeClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-bold',
      isOverdue: false,
      isDueToday: false,
      isDueSoon: true,
      daysLate: 0,
      daysLeft,
    };
  }

  // Regular upcoming bill
  return {
    status: 'upcoming',
    label: isTL ? `Due tuwing ika-${dueDay}` : `Due Day ${dueDay}`,
    shortLabel: isTL ? `Ika-${dueDay}` : `Due Day ${dueDay}`,
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-medium',
    isOverdue: false,
    isDueToday: false,
    isDueSoon: false,
    daysLate: 0,
    daysLeft,
  };
}
