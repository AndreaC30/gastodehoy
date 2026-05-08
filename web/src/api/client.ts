import { setAnonymous } from "@/auth";

export class UnauthorizedError extends Error {
  constructor(message = "Sesión caducada") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Same-origin en prod; en dev Vite proxy /api con la cookie. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
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
