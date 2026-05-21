/**
 * Guía: bloquea rueda/dedo, desplaza con scrollIntoView (sin overflow:hidden).
 */

let active = false;
let blockHandler: ((e: Event) => void) | null = null;

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

  el.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });

  await waitMs(550);

  if (Math.abs(window.scrollY - beforeY) < 4) {
    const rect = el.getBoundingClientRect();
    const targetY = Math.max(
      0,
      window.scrollY + rect.top - 72,
    );
    window.scrollTo({ top: targetY, behavior: "auto" });
    await waitMs(50);
  }
}

export function tourMeasureTarget(
  selector: string,
): { top: number; left: number; width: number; height: number } | null {
  const el = document.querySelector(`[data-tour="${selector}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const pad = 8;
  return {
    top: Math.max(4, r.top - pad),
    left: Math.max(4, r.left - pad),
    width: Math.min(window.innerWidth - 16, r.width + pad * 2),
    height: r.height + pad * 2,
  };
}
