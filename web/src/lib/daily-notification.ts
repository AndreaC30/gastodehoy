import { api } from "@/api/client";
import type { DailyNotification } from "@/api/types";
import {
  isDailyNotificationEnabled,
  markDailyNotificationShown,
  wasDailyNotificationShownToday,
} from "@/lib/daily-notification-preference";

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted") {
    return "granted";
  }
  if (Notification.permission === "denied") {
    return "denied";
  }
  return Notification.requestPermission();
}

export async function maybeShowDailyNotification(): Promise<void> {
  if (!isDailyNotificationEnabled()) {
    return;
  }
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }
  if (wasDailyNotificationShownToday()) {
    return;
  }

  const payload = await api<DailyNotification | null>(
    "/api/insights/daily-notification",
  );
  if (!payload) {
    return;
  }

  const icon = "/gastodehoy-favicon-192.png";
  const n = new Notification(payload.title, {
    body: payload.body,
    icon,
    tag: payload.tag,
  });
  n.onclick = () => {
    window.focus();
    n.close();
  };
  markDailyNotificationShown();
}
