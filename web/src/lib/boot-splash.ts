/** Logo URL at site root (from `web/public`, copied at build). */
export const BOOT_SPLASH_LOGO_SRC = "/gastodehoy-logo.png";

/** Minimum time the branded splash stays visible (ms). */
export const BOOT_SPLASH_MIN_MS = 2800;

declare global {
  interface Window {
    __gdhSplashStart?: number;
  }
}

export function markBootSplashStart(): void {
  if (typeof window === "undefined") return;
  if (window.__gdhSplashStart == null) {
    window.__gdhSplashStart = Date.now();
  }
}

export function waitForBootSplashMinimum(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  markBootSplashStart();
  const start = window.__gdhSplashStart ?? Date.now();
  const remaining = BOOT_SPLASH_MIN_MS - (Date.now() - start);
  if (remaining <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    window.setTimeout(resolve, remaining);
  });
}

/** Remove the static HTML splash once the React splash gate finishes. */
export function removeHtmlBootSplash(): void {
  document.getElementById("boot-splash")?.remove();
}
