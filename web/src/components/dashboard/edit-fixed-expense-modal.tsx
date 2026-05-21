import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { IoClose } from "react-icons/io5";
import { api } from "@/api/client";
import type { FixedExpense } from "@/api/types";
import { DEFAULT_FIXED_EXPENSE_ICON } from "@/components/dashboard/category-icon";
import { IconSelectDropdown } from "@/components/dashboard/icon-select-dropdown";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useDialogA11y } from "@/lib/use-dialog-a11y";
import { BTN_PRIMARY, BTN_SECONDARY, FOCUS_RING, INPUT_CLASS } from "@/lib/ui-a11y";

type Props = {
  expense: FixedExpense;
  onClose: () => void;
  onSaved: () => void;
};

export function EditFixedExpenseModal({ expense, onClose, onSaved }: Props) {
  const [name, setName] = useState(expense.name);
  const [amount, setAmount] = useState(String(expense.amount));
  const [icon, setIcon] = useState(expense.icon ?? DEFAULT_FIXED_EXPENSE_ICON);
  const [error, setError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  useBodyScrollLock(true);
  useDialogA11y(true, panelRef);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const saveMut = useMutation({
    mutationFn: (body: { name: string; amount: string; icon: string }) =>
      api<FixedExpense>(`/api/fixed-expenses/${expense.id}`, {
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
    const trimmed = name.trim();
    if (!trimmed) {
      setError("El nombre no puede estar vacío");
      return;
    }
    saveMut.mutate({
      name: trimmed,
      amount: amount || "0",
      icon,
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
      aria-labelledby="edit-fixed-title"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="modal-scroll max-h-[min(90vh,100dvh)] w-full max-w-md touch-auto overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-t-2xl border border-slate-800 bg-slate-900 p-4 shadow-2xl sm:rounded-2xl sm:p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="edit-fixed-title" className="text-lg font-bold">
            Editar gasto fijo
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
            <label htmlFor="edit-fixed-name" className="mb-1.5 block text-xs text-slate-500">
              Concepto
            </label>
            <div className="flex min-w-0 gap-2">
              <IconSelectDropdown value={icon} onChange={setIcon} />
              <input
                id="edit-fixed-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={`min-w-0 flex-1 ${INPUT_CLASS}`}
              />
            </div>
          </div>
          <div>
            <label htmlFor="edit-fixed-amount" className="mb-1.5 block text-xs text-slate-500">
              Importe mensual (€)
            </label>
            <input
              id="edit-fixed-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
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
