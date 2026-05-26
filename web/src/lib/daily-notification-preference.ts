const ENABLED_KEY = "gdh_daily_notifications";
const LAST_SHOWN_KEY = "gdh_daily_notification_date";

export function isDailyNotificationEnabled(): boolean {
  return localStorage.getItem(ENABLED_KEY) === "1";
}

export function setDailyNotificationEnabled(enabled: boolean): void {
  localStorage.setItem(ENABLED_KEY, enabled ? "1" : "0");
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function markDailyNotificationShown(): void {
  localStorage.setItem(LAST_SHOWN_KEY, todayKey());
}

export function wasDailyNotificationShownToday(): boolean {
  return localStorage.getItem(LAST_SHOWN_KEY) === todayKey();
}
