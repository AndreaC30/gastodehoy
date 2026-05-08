import type { User } from "@/api/types";

type Status = "loading" | "anon" | "auth";

type AuthSnapshot = { status: Status; user: User | null };

const listeners = new Set<() => void>();
let current: AuthSnapshot = { status: "loading", user: null };

export function snapshot(): AuthSnapshot {
  return current;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

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

export function setUser(user: User): void {
  setSnapshot({ status: "auth", user });
}

export function setAnonymous(): void {
  setSnapshot({ status: "anon", user: null });
}

export function setLoading(): void {
  setSnapshot({ status: "loading", user: null });
}
