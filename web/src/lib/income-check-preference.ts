import { api } from "@/api/client";
import type { Settings } from "@/api/types";
import {
  incomeCheckMonthKey,
  isDevForceIncomeCheck,
  markIncomeCheckAnsweredLocal,
} from "@/lib/month-income-check";
import { todayDate } from "@/lib/month-context";

/** Whether the user already completed the day-1 income check this month (server + local). */
export function isIncomeCheckAnsweredForMonth(
  date: Date,
  serverMonth?: string | null,
): boolean {
  const key = incomeCheckMonthKey(date);
  if (serverMonth === key) return true;
  // Dev + force day-1: after a DB reset, ignore stale localStorage flags.
  if (isDevForceIncomeCheck() && !serverMonth) return false;
  try {
    return localStorage.getItem(`gdh_income_check_${key}`) === "1";
  } catch {
    return false;
  }
}

/** Persist month answered on server (all devices) and locally as cache. */
export async function markIncomeCheckAnswered(
  date: Date = todayDate(),
): Promise<void> {
  const month = incomeCheckMonthKey(date);
  markIncomeCheckAnsweredLocal(date);
  try {
    const s = await api<Settings>("/api/settings");
    await api<Settings>("/api/settings", {
      method: "PUT",
      body: JSON.stringify({
        monthly_income: s.monthly_income,
        savings_mode: s.savings_mode,
        savings_percent: s.savings_percent,
        savings_amount: s.savings_amount,
        dashboard_tour_completed: s.dashboard_tour_completed ?? false,
        language: s.language ?? null,
        income_check_month: month,
      }),
    });
  } catch {
    /* local flag already set */
  }
}
