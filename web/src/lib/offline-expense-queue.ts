/**
 * Cola de gastos anotados sin conexión.
 *
 * Solo guarda el alta de gastos del día a día. Cada gasto lleva un `client_id`
 * (clave de idempotencia): si el envío llegó pero la respuesta se perdió, el
 * reenvío devuelve el gasto ya creado en vez de duplicarlo.
 * Está en localStorage porque el service worker no toca /api (NetworkOnly) y
 * iOS no tiene Background Sync: el envío lo hace la propia app al volver a abrirse
 * o al recuperar la conexión.
 */
const KEY = "gdh-offline-expenses";
export const QUEUE_EVENT = "gdh-offline-queue";

export type QueuedExpenseBody = {
  amount: string;
  note: string | null;
  category_id: number | null;
  /** Fecha local del momento de anotar, no la del reenvío. */
  occurred_at: string;
  client_id: string;
};

export type QueuedExpense = {
  userId: number;
  queuedAt: number;
  body: QueuedExpenseBody;
};

function isQueued(x: unknown): x is QueuedExpense {
  if (!x || typeof x !== "object") return false;
  const q = x as Partial<QueuedExpense>;
  const b = q.body as Partial<QueuedExpenseBody> | undefined;
  return (
    typeof q.userId === "number" &&
    typeof q.queuedAt === "number" &&
    !!b &&
    typeof b.amount === "string" &&
    typeof b.occurred_at === "string" &&
    typeof b.client_id === "string"
  );
}

/** Texto tal cual está guardado: sirve de instantánea estable para React. */
export function readQueueRaw(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export function parseQueue(raw: string): QueuedExpense[] {
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(isQueued) : [];
  } catch {
    return [];
  }
}

function write(items: QueuedExpense[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* sin almacenamiento no hay cola: el llamador lo detecta con enqueue() */
  }
  window.dispatchEvent(new Event(QUEUE_EVENT));
}

/** false si no se pudo guardar (almacenamiento bloqueado o lleno). */
export function enqueueExpense(item: QueuedExpense): boolean {
  const items = parseQueue(readQueueRaw());
  items.push(item);
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(QUEUE_EVENT));
  return true;
}

export function removeQueued(clientId: string): void {
  write(parseQueue(readQueueRaw()).filter((q) => q.body.client_id !== clientId));
}

/** Suscripción para useSyncExternalStore (esta pestaña y otras). */
export function subscribeQueue(listener: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) listener();
  };
  window.addEventListener(QUEUE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(QUEUE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** UUID para `client_id` (8 a 64 caracteres [A-Za-z0-9_-]). */
export function newClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  const rnd = () => Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${rnd()}-${rnd()}`;
}

/** Fecha local de hoy como AAAA-MM-DD. */
export function localDateIso(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** fetch() rechaza con TypeError cuando no hay red; un 4xx/5xx no es esto. */
export function isConnectionError(err: unknown): boolean {
  return err instanceof TypeError;
}
