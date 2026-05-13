/**
 * Thin fetch wrapper for the JSON API.
 *
 * - Always sends the session cookie (`credentials: "include"`).
 * - Maps 401 responses to a logged-out auth state and throws.
 * - Surfaces FastAPI's `detail` (string or pydantic list of errors) as
 *   the thrown Error message.
 */
import { setAnonymous } from "@/auth";

/** Thrown on HTTP 401 so callers can distinguish session loss. */
export class UnauthorizedError extends Error {
  constructor(message = "Sesión caducada") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Call the API: same-origin in prod, Vite-proxied `/api` in dev.
 *
 * Returns the parsed JSON body typed as `T`, or `undefined as T` for 204.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };

  const res = await fetch(path, {
    credentials: "include",
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string>) },
  });

  if (res.status === 401) {
    setAnonymous();
    throw new UnauthorizedError();
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body: unknown = await res.json();
      if (
        body &&
        typeof body === "object" &&
        "detail" in body &&
        body.detail != null
      ) {
        const d = body.detail;
        detail = Array.isArray(d)
          ? d.map((x: { msg?: string }) => x.msg ?? String(x)).join(", ")
          : String(d);
      }
    } catch {
      /* ignore */
    }
    const base = `HTTP ${res.status}: ${detail || res.statusText || "Error"}`;
    if (res.status === 404) {
      throw new Error(
        `${base}. ¿Otro servicio en el puerto del proxy? Ajusta VITE_API_PROXY_TARGET en .env (raíz del repo o web/) al puerto real de uvicorn (p. ej. 8001).`,
      );
    }
    throw new Error(base);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
