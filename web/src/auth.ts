/**
 * Tiny pub/sub auth store, designed for `useSyncExternalStore`.
 *
 * The snapshot reference is stable across reads when nothing relevant
 * changed, which is what `useSyncExternalStore` requires to avoid
 * tearing/infinite-render in React 18.
 */
import type { User } from "@/api/types";

/** Normaliza `must_change_password` (JSON puede mandar true o 1). */
function normalizeUser(u: User): User {
  const raw = u.must_change_password as unknown;
  const must =
    raw === true ||
    raw === 1 ||
    raw === "1" ||
    String(raw).toLowerCase() === "true";
  return { ...u, must_change_password: must };
}

/** "loading" while we ask the server `/me`, then either "auth" or "anon". */
type Status = "loading" | "anon" | "auth";

type AuthSnapshot = { status: Status; user: User | null };

const listeners = new Set<() => void>();
let current: AuthSnapshot = { status: "loading", user: null };

/** Current snapshot. Reference-stable when fields haven't changed. */
export function snapshot(): AuthSnapshot {
  return current;
}

/** Subscribe to changes; returns the unsubscribe function. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Internal: replace the snapshot only if anything observable changed. */
function setSnapshot(next: AuthSnapshot): void {
  if (
    next.status === current.status &&
    next.user?.id === current.user?.id &&
    next.user?.email === current.user?.email &&
    next.user?.name === current.user?.name &&
    next.user?.must_change_password === current.user?.must_change_password
  ) {
    return;
  }
  current = next;
  for (const l of listeners) l();
}

/** Mark the user as authenticated (after register/login). */
export function setUser(user: User): void {
  setSnapshot({ status: "auth", user: normalizeUser(user) });
}

/** Mark the session as logged out (also called by the API client on 401). */
export function setAnonymous(): void {
  // Failsafe: unlock body scroll in case a modal's cleanup didn't run
  if (typeof document !== "undefined") {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
  }
  setSnapshot({ status: "anon", user: null });
}

/** Switch back to the initial loading state (rarely needed). */
export function setLoading(): void {
  setSnapshot({ status: "loading", user: null });
}
