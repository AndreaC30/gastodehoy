/**
 * User density preference (compact / comfortable / spacious).
 *
 * Stored in localStorage so it persists across sessions and survives
 * page reloads. Defaults to "comfortable" when no preference is set.
 */
export type Density = "compact" | "comfortable" | "spacious";

const KEY = "gastodehoy-density";
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((cb) => cb());
}

/** Subscribe to density changes (for useSyncExternalStore). */
export function subscribeDensity(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

/** Read the current density preference. Safe to call during SSR. */
export function getDensity(): Density {
  if (typeof window === "undefined") return "comfortable";
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === "compact" || raw === "comfortable" || raw === "spacious") {
      return raw;
    }
  } catch {
    /* localStorage blocked — ignore */
  }
  return "comfortable";
}

/** Persist a new density preference and notify subscribers. */
export function setDensity(density: Density): void {
  try {
    localStorage.setItem(KEY, density);
  } catch {
    /* silently ignore */
  }
  notify();
}
