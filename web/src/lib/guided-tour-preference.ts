import { api } from "@/api/client";
import type { Settings } from "@/api/types";

const LEGACY_KEY = "gastodehoy_dashboard_tour_done";

/** Check if user completed the dashboard tour (server-side, survives cookie wipes). */
export async function hasCompletedDashboardTour(): Promise<boolean> {
  try {
    const s = await api<Settings>("/api/settings");
    if (s.dashboard_tour_completed) return true;
    // Migrate legacy localStorage flag to server if present
    if (localStorage.getItem(LEGACY_KEY) === "1") {
      localStorage.removeItem(LEGACY_KEY);
      await markDashboardTourCompleted();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Persist tour completion to server so it survives browser data clears. */
export async function markDashboardTourCompleted(): Promise<void> {
  try {
    const s = await api<Settings>("/api/settings");
    await api<Settings>("/api/settings", {
      method: "PUT",
      body: JSON.stringify({
        monthly_income: s.monthly_income,
        savings_mode: s.savings_mode,
        savings_percent: s.savings_percent,
        savings_amount: s.savings_amount,
        dashboard_tour_completed: true,
      }),
    });
  } catch {
    /* ignore */
  }
}
