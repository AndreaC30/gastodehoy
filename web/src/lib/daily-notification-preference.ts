const ENABLED_KEY = "gdh_daily_notifications";
const LAST_SHOWN_KEY = "gdh_daily_notification_date";
const INSTALL_PROMPT_KEY = "gdh_notify_install_prompt";

export function isDailyNotificationEnabled(): boolean {
  return localStorage.getItem(ENABLED_KEY) === "1";
}

export function setDailyNotificationEnabled(enabled: boolean): void {
  localStorage.setItem(ENABLED_KEY, enabled ? "1" : "0");
}

/** The person already chose "not now" on the first open of the installed app. */
export function wasInstallNotifyDismissed(): boolean {
  return localStorage.getItem(INSTALL_PROMPT_KEY) === "later";
}

export function dismissInstallNotify(): void {
  localStorage.setItem(INSTALL_PROMPT_KEY, "later");
}

/** Día local AAAA-MM-DD (con toISOString el «hoy» cambiaba a las 01:00 o 02:00 locales). */
export function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function markDailyNotificationShown(): void {
  localStorage.setItem(LAST_SHOWN_KEY, todayKey());
}

export function wasDailyNotificationShownToday(): boolean {
  return localStorage.getItem(LAST_SHOWN_KEY) === todayKey();
}
