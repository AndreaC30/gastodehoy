/**
 * Optimistic undoable delete hook for TanStack Query.
 *
 * Usage: when the user clicks delete, the item disappears instantly from the
 * cache. A toast with an undo button appears. If the user clicks undo, the
 * item is restored. If the toast expires (default 5s), the real DELETE API
 * call fires.
 */
import { useCallback, useRef, useState } from "react";

type UndoableDeleteOptions<T extends { id: number }> = {
  /** API DELETE function (receives the item id). */
  deleteFn: (id: number) => Promise<unknown>;
  /** Snapshot current items from cache. */
  getItems: () => T[];
  /** Write items back to cache. */
  setItems: (items: T[]) => void;
  /** Called after the real delete succeeds. */
  onRemoved: () => void;
  /** Called when the user clicks undo (item restored in cache). */
  onRestored: () => void;
  /** Ms before the real DELETE fires (default 5000). */
  timeout?: number;
};

export function useUndoableDelete<T extends { id: number }>(
  options: UndoableDeleteOptions<T>,
) {
  const {
    deleteFn,
    getItems,
    setItems,
    onRemoved,
    onRestored,
    timeout = 5000,
  } = options;

  const [isPending, setIsPending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotRef = useRef<T[] | null>(null);

  /** Start an undoable delete for the given item id. */
  const perform = useCallback(
    (id: number) => {
      // Cancel any in-flight undo timer and restore its snapshot first.
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        if (snapshotRef.current) {
          setItems(snapshotRef.current);
        }
      }

      const current = getItems();
      snapshotRef.current = current;

      // Optimistic removal.
      setItems(current.filter((item) => item.id !== id));
      setIsPending(true);

      timerRef.current = setTimeout(async () => {
        try {
          await deleteFn(id);
          onRemoved();
        } catch {
          // Restore on error.
          if (snapshotRef.current) {
            setItems(snapshotRef.current);
          }
        } finally {
          setIsPending(false);
          timerRef.current = null;
          snapshotRef.current = null;
        }
      }, timeout);
    },
    [deleteFn, getItems, setItems, onRemoved, timeout],
  );

  /** Undo the pending delete: clear timer, restore snapshot. */
  const undo = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (snapshotRef.current) {
      setItems(snapshotRef.current);
      snapshotRef.current = null;
    }
    setIsPending(false);
    onRestored();
  }, [setItems, onRestored]);

  return { perform, undo, isPending };
}
