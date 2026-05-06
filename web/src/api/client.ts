/** Same-origin en prod; en dev Vite proxies /api. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init?.headers,
    },
    ...init,
  });
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
