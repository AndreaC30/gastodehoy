/** Detect installed PWA / standalone display mode. */

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return true;
  const mq = window.matchMedia("(display-mode: standalone)");
  if (mq.matches) return true;
  // iOS Safari legacy
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

export function getInstallHintPlatform(): "ios" | "android" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/**
 * Whether the OS/browser can show real notifications for this context.
 * iOS only supports Web Notifications reliably from an installed Home Screen app.
 */
export function canUseOsNotifications(): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  if (getInstallHintPlatform() === "ios" && !isStandaloneDisplay()) {
    return false;
  }
  return true;
}
