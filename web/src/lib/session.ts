/** Client-side session teardown (cookie cleared server-side). */
import { setAnonymous } from "@/auth";
import { api } from "@/api/client";

export async function logout(): Promise<void> {
  try {
    await api<void>("/api/auth/logout", { method: "POST" });
  } catch {
    /* ignore */
  } finally {
    setAnonymous();
  }
}
