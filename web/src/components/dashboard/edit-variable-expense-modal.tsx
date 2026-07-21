import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoClose } from "react-icons/io5";
import { api } from "@/api/client";
import type { ExpenseCategory, VariableExpense } from "@/api/types";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useDialogA11y } from "@/lib/use-dialog-a11y";
import { BTN_PRIMARY, BTN_SECONDARY, FOCUS_RING, INPUT_CLASS } from "@/lib/ui-a11y";

type Props = {
  expense: VariableExpense;
  categories: ExpenseCategory[];
  onClose: () => void;
  onSaved: () => void;
};

export function EditVariableExpenseModal({
  expense,
  categories,
  onClose,
  onSaved,
}: Props) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(String(expense.amount));
  const [occurredAt, setOccurredAt] = useState(expense.occurred_at);
  const [categoryId, setCategoryId] = useState(
    expense.category_id != null ? String(expense.category_id) : "",
  );
  const [note, setNote] = useState(expense.note ?? "");
  const [error, setError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  useBodyScrollLock(true);
  useDialogA11y(true, panelRef);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onTouchStart(e: React.TouchEvent) {
    const panel = panelRef.current;
    if (!panel) return;
    if (panel.scrollTop > 5) return;
    touchStartY.current = e.touches[0].clientY;
    setDragging(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!dragging) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta < 0) return;
    const clamped = Math.min(delta, 120);
    setDragOffset(clamped);
  }

  function onTouchEnd() {
    if (!dragging) return;
    setDragging(false);
    if (dragOffset > 80) {
      onClose();
    }
    setDragOffset(0);
  }

  const saveMut = useMutation({
    mutationFn: (body: {
      amount: string;
      occurred_at: string;
      note: string | null;
      category_id: number | null;
    }) =>
      api<VariableExpense>(`/api/expenses/${expense.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedNote = note.trim();
    saveMut.mutate({
      amount,
      occurred_at: occurredAt,
      note: trimmedNote || null,
      category_id: categoryId ? Number(categoryId) : null,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex touch-none items-end justify-center overflow-hidden bg-black/60 p-3 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-variable-title"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        style={{ transform: `translateY(${dragOffset}px)` }}
        className={`modal-scroll w-full max-w-md touch-auto overflow-y-auto overscroll-y-contain rounded-t-2xl border border-slate-800 bg-slate-900 p-4 shadow-2xl transition-transform duration-300 sm:rounded-2xl sm:p-5 ${dragging ? "transition-none" : ""}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag handle – visible only on mobile */}
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-600 sm:hidden" />
        <div className="flex items-center justify-between gap-3">
          <h2 id="edit-variable-title" className="text-lg font-bold">
            Editar gasto
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`min-h-11 min-w-11 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 ${FOCUS_RING}`}
            aria-label="Cerrar"
          >
            <IoClose className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {error && (
          <p
            className="mt-3 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200"
            role="alert"
          >
            {error}
          </p>
        )}

        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="edit-var-amount" className="mb-1.5 block text-xs text-slate-500">
              Cantidad (€)
            </label>
            <input
              id="edit-var-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="edit-var-date" className="mb-1.5 block text-xs text-slate-500">
              Fecha
            </label>
            <input
              id="edit-var-date"
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              required
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="edit-var-category" className="mb-1.5 block text-xs text-slate-500">
              {t("editVariableExpense.category")}
            </label>
            <select
              id="edit-var-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">{t("editVariableExpense.uncategorized")}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="edit-var-note" className="mb-1.5 block text-xs text-slate-500">
              Nota (opcional)
            </label>
            <input
              id="edit-var-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 ${BTN_SECONDARY}`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saveMut.isPending}
              className={`flex-1 ${BTN_PRIMARY}`}
            >
              {saveMut.isPending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
