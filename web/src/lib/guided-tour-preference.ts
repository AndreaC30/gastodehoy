const KEY = "gastodehoy_dashboard_tour_done";

export function hasCompletedDashboardTour(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markDashboardTourCompleted(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearDashboardTourCompleted(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
