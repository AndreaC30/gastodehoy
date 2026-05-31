/**
 * Guía: bloquea rueda/dedo, desplaza con scrollIntoView (sin overflow:hidden).
 * Ajustes específicos para iOS PWA standalone donde WKWebView maneja distinto
 * el viewport y el scroll.
 */

let active = false;
let blockHandler: ((e: Event) => void) | null = null;

/** True if running as iOS standalone PWA (WKWebView outside Safari). */
function isIOSStandalone(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    ("standalone" in navigator && (navigator as any).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function tourScrollLockEnable(): void {
  if (active) return;
  active = true;

  blockHandler = (e: Event) => {
    const t = e.target;
    if (
      t instanceof Element &&
      t.closest("[data-guided-tour-controls]")
    ) {
      return;
    }
    e.preventDefault();
  };

  document.addEventListener("wheel", blockHandler, {
    passive: false,
    capture: true,
  });
  document.addEventListener("touchmove", blockHandler, {
    passive: false,
    capture: true,
  });
}

export function tourScrollLockDisable(): void {
  if (!active || !blockHandler) return;
  active = false;
  document.removeEventListener("wheel", blockHandler, true);
  document.removeEventListener("touchmove", blockHandler, true);
  blockHandler = null;
}

export async function tourScrollToTarget(selector: string): Promise<void> {
  const el = document.querySelector(
    `[data-tour="${selector}"]`,
  ) as HTMLElement | null;
  if (!el || !active) return;

  const beforeY = window.scrollY;

  // iOS needs longer timeout for smooth scroll to finish
  const scrollTimeout = isIOSStandalone() ? 800 : 550;

  el.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });

  await waitMs(scrollTimeout);

  // If scrollIntoView didn't move (common on iOS standalone), force it
  if (Math.abs(window.scrollY - beforeY) < 4) {
    const rect = el.getBoundingClientRect();
    // Leave 80px at top so the spotlight + controls panel don't cover the target
    const targetY = Math.max(0, window.scrollY + rect.top - 80);
    window.scrollTo({ top: targetY, behavior: "auto" });
    await waitMs(isIOSStandalone() ? 150 : 50);
  }
}

export function tourMeasureTarget(
  selector: string,
): { top: number; left: number; width: number; height: number } | null {
  const el = document.querySelector(`[data-tour="${selector}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const pad = 8;
  // On iOS standalone, use screen.width/height instead of window.inner*
  const maxW = isIOSStandalone()
    ? Math.min(window.screen.width, window.innerWidth) - 16
    : window.innerWidth - 16;
  return {
    top: Math.max(4, r.top - pad),
    left: Math.max(4, r.left - pad),
    width: Math.min(maxW, r.width + pad * 2),
    height: r.height + pad * 2,
  };
}
