/**
 * Tiny pub/sub auth store, designed for `useSyncExternalStore`.
 *
 * The snapshot reference is stable across reads when nothing relevant
 * changed, which is what `useSyncExternalStore` requires to avoid
 * tearing/infinite-render in React 18.
 */
import type { User } from "@/api/types";

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
    next.user?.name === current.user?.name
  ) {
    return;
  }
  current = next;
  for (const l of listeners) l();
}

/** Mark the user as authenticated (after register/login/recover). */
export function setUser(user: User): void {
  setSnapshot({ status: "auth", user });
}

/** Mark the session as logged out (also called by the API client on 401). */
export function setAnonymous(): void {
  setSnapshot({ status: "anon", user: null });
}

/** Switch back to the initial loading state (rarely needed). */
export function setLoading(): void {
  setSnapshot({ status: "loading", user: null });
}
