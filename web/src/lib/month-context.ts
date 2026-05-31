const DISMISSED_VALUE = "1";

/** Current calendar date in the user's browser timezone. */
export function todayDate(): Date {
  return new Date();
}

/** Localized month name and year, e.g. "May 2026". */
export function formatMonthYear(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    date,
  );
}

/** Localized month name only, e.g. "May" — for in-copy hints. */
export function formatMonthLong(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "long" }).format(date);
}

/** Parse API `reference_date` (YYYY-MM-DD) or fall back to today. */
export function budgetReferenceDate(referenceDate?: string): Date {
  if (referenceDate) {
    const [y, m, d] = referenceDate.split("-").map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
  }
  return todayDate();
}

/** Days remaining in the month, including today. */
export function daysLeftInMonth(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return lastDay - date.getDate() + 1;
}

/** Days 1–3 of the month (inclusive). */
export function isMonthStartWindow(date: Date): boolean {
  const day = date.getDate();
  return day >= 1 && day <= 3;
}

/** Last three calendar days of the month (inclusive). */
export function isMonthEndWindow(date: Date): boolean {
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return date.getDate() >= lastDay - 2;
}

export function monthTipStorageKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `gdh_month_tip_${year}-${month}`;
}

export function isMonthTipDismissed(date: Date): boolean {
  try {
    return localStorage.getItem(monthTipStorageKey(date)) === DISMISSED_VALUE;
  } catch {
    return false;
  }
}

export function dismissMonthTip(date: Date): void {
  try {
    localStorage.setItem(monthTipStorageKey(date), DISMISSED_VALUE);
  } catch {
    /* ignore quota / private mode */
  }
}
