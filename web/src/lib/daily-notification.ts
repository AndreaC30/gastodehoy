import { api } from "@/api/client";
import type { DailyNotification } from "@/api/types";
import {
  isDailyNotificationEnabled,
  markDailyNotificationShown,
  wasDailyNotificationShownToday,
} from "@/lib/daily-notification-preference";

export type DailyAviso = {
  title: string;
  body: string;
};

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

/**
 * Show the daily aviso at most once per day.
 * Prefer a browser Notification when permission is granted; otherwise return
 * the payload for an in-app toast/banner.
 */
export async function maybeShowDailyNotification(): Promise<DailyAviso | null> {
  if (!isDailyNotificationEnabled()) {
    return null;
  }
  if (wasDailyNotificationShownToday()) {
    return null;
  }

  const payload = await api<DailyNotification | null>(
    "/api/insights/daily-notification",
  );
  if (!payload) {
    return null;
  }

  if ("Notification" in window && Notification.permission === "granted") {
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
    return null;
  }

  markDailyNotificationShown();
  return { title: payload.title, body: payload.body };
}
