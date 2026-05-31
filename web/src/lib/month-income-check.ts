const ANSWERED_VALUE = "1";

/** Dev-only: VITE_DEV_FORCE_INCOME_CHECK=true in repo root .env */
export function isDevForceIncomeCheck(): boolean {
  return (
    import.meta.env.DEV &&
    import.meta.env.VITE_DEV_FORCE_INCOME_CHECK === "true"
  );
}

/**
 * True on calendar day 1 (local timezone).
 * In dev, set VITE_DEV_FORCE_INCOME_CHECK=true in repo root .env to test any day.
 */
export function isFirstDayOfMonth(date: Date): boolean {
  if (isDevForceIncomeCheck()) return true;
  return date.getDate() === 1;
}

/** YYYY-MM for income-check storage (local + server). */
export function incomeCheckMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function incomeCheckStorageKey(date: Date): string {
  return `gdh_income_check_${incomeCheckMonthKey(date)}`;
}

export function markIncomeCheckAnsweredLocal(date: Date): void {
  try {
    localStorage.setItem(incomeCheckStorageKey(date), ANSWERED_VALUE);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Dev helper: clear the answered flag for the current month. */
export function clearIncomeCheckAnsweredLocal(date: Date): void {
  try {
    localStorage.removeItem(incomeCheckStorageKey(date));
  } catch {
    /* ignore */
  }
}
