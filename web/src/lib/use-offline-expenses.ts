/** Envía los gastos de la cola cuando hay conexión y expone su estado. */
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ApiError, UnauthorizedError, api } from "@/api/client";
import {
  isConnectionError,
  parseQueue,
  readQueueRaw,
  removeQueued,
  subscribeQueue,
  type QueuedExpenseBody,
} from "@/lib/offline-expense-queue";
import { invalidateBudgetQueries } from "@/lib/query-keys";

export type FlushResult = { sent: number; dropped: number };

const RETRY_MS = 30_000;

/** "sent": llegó; "drop": el servidor lo rechaza, no tiene arreglo; "stop": reintentar luego. */
async function post(body: QueuedExpenseBody): Promise<"sent" | "drop" | "stop"> {
  try {
    await api("/api/expenses", { method: "POST", body: JSON.stringify(body) });
    return "sent";
  } catch (err) {
    if (isConnectionError(err) || err instanceof UnauthorizedError) return "stop";
    if (err instanceof ApiError) {
      if (err.status === 429 || err.status >= 500) return "stop";
      // Puede que la categoría se borrara mientras tanto: mejor sin categoría que perder el gasto.
      if (body.category_id != null) return post({ ...body, category_id: null });
    }
    return "drop";
  }
}

export function useOfflineExpenses(userId: number, onFlushed: (r: FlushResult) => void) {
  const qc = useQueryClient();
  const raw = useSyncExternalStore(subscribeQueue, readQueueRaw, () => "[]");
  const pending = useMemo(
    () => parseQueue(raw).filter((q) => q.userId === userId).length,
    [raw, userId],
  );
  const [online, setOnline] = useState(() => navigator.onLine);
  const [flushing, setFlushing] = useState(false);
  const busy = useRef(false);
  const onFlushedRef = useRef(onFlushed);
  useEffect(() => {
    onFlushedRef.current = onFlushed;
  }, [onFlushed]);

  const flush = useCallback(async () => {
    if (busy.current || !navigator.onLine) return;
    const items = parseQueue(readQueueRaw()).filter((q) => q.userId === userId);
    if (items.length === 0) return;
    busy.current = true;
    setFlushing(true);
    let sent = 0;
    let dropped = 0;
    try {
      for (const item of items) {
        const outcome = await post(item.body);
        if (outcome === "stop") break;
        removeQueued(item.body.client_id);
        if (outcome === "sent") sent += 1;
        else dropped += 1;
      }
    } finally {
      busy.current = false;
      setFlushing(false);
    }
    if (sent > 0 || dropped > 0) {
      void invalidateBudgetQueries(qc);
      onFlushedRef.current({ sent, dropped });
    }
  }, [qc, userId]);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      void flush();
    };
    const goOffline = () => setOnline(false);
    const visible = () => {
      if (document.visibilityState === "visible") void flush();
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    document.addEventListener("visibilitychange", visible);
    void flush();
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [flush]);

  // Si un envío se queda a medias (servidor caído, límite), vuelve a intentarlo.
  useEffect(() => {
    if (pending === 0 || !online) return;
    const id = window.setInterval(() => void flush(), RETRY_MS);
    return () => window.clearInterval(id);
  }, [pending, online, flush]);

  return { pending, online, flushing, flush };
}
