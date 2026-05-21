/**
 * Modal for savings goals (same pattern as SettingsModal).
 */
import { useEffect } from "react";
import { IoClose } from "react-icons/io5";
import { SavingsGoalsContent } from "@/components/dashboard/savings-goals-panel";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

type Props = {
  reservedSavings?: string | number;
  onClose: () => void;
};

export function SavingsGoalsModal({ reservedSavings, onClose }: Props) {
  useBodyScrollLock(true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex touch-none items-end justify-center overflow-hidden bg-black/60 px-3 py-4 sm:items-center sm:px-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="savings-goals-modal-title"
      onClick={onClose}
    >
      <div
        className="modal-scroll max-h-[min(90vh,100dvh)] w-full max-w-lg touch-auto overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-t-2xl border border-slate-800 bg-slate-900 p-4 pr-3 shadow-2xl shadow-black/50 sm:rounded-2xl sm:p-5 sm:pr-4"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              id="savings-goals-modal-title"
              className="text-lg font-bold tracking-tight"
            >
              Metas de ahorro
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Objetivos con nombre y cantidad; actualiza lo que llevas ahorrado.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg border border-slate-800 p-1.5 text-slate-400 hover:bg-slate-800/60"
          >
            <IoClose className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <SavingsGoalsContent reservedSavings={reservedSavings} />
      </div>
    </div>
  );
}
