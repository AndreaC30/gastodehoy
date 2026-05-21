/**
 * Account hub: session logout and destructive actions separated from main nav.
 */
import { useEffect, useRef, useState } from "react";
import { IoClose, IoLogOutOutline } from "react-icons/io5";
import { DeleteAccountModal } from "@/components/delete-account-modal";
import { logout } from "@/lib/session";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useDialogA11y } from "@/lib/use-dialog-a11y";
import { FOCUS_RING } from "@/lib/ui-a11y";

type Props = {
  open: boolean;
  profileName: string;
  onClose: () => void;
};

export function AccountModal({ open, profileName, onClose }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(open && !deleteOpen);
  useDialogA11y(open && !deleteOpen, panelRef);

  useEffect(() => {
    if (!open) setDeleteOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !deleteOpen) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, deleteOpen, onClose]);

  if (!open) return null;

  function startDelete() {
    onClose();
    setDeleteOpen(true);
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[70] flex touch-none items-end justify-center overflow-hidden bg-black/60 px-3 py-4 sm:items-center sm:px-4 sm:py-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-modal-title"
        onClick={onClose}
      >
        <div
          ref={panelRef}
          tabIndex={-1}
          className="modal-scroll w-full max-w-md touch-auto overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-t-2xl border border-slate-800 bg-slate-900 p-4 shadow-2xl sm:rounded-2xl sm:p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2
                id="account-modal-title"
                className="text-lg font-bold tracking-tight"
              >
                Cuenta
              </h2>
              <p className="mt-1 truncate text-sm text-teal-300">{profileName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className={`shrink-0 rounded-lg border border-slate-800 p-1.5 text-slate-400 hover:bg-slate-800/60 ${FOCUS_RING}`}
            >
              <IoClose className="h-5 w-5" aria-hidden />
            </button>
          </header>

          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Ingresos, categorías y metas están en el menú principal. Aquí solo
            gestionas la sesión y, si lo necesitas, el cierre de la cuenta.
          </p>

          <button
            type="button"
            onClick={() => {
              onClose();
              void logout();
            }}
            className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 ${FOCUS_RING}`}
          >
            <IoLogOutOutline className="h-5 w-5 shrink-0" aria-hidden />
            Cerrar sesión
          </button>

          <div className="mt-8 rounded-xl border border-rose-500/20 bg-rose-950/15 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-rose-400/90">
              Zona de peligro
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Borrar la cuenta elimina gastos, categorías y ajustes de forma
              permanente. Te pediremos la contraseña en un segundo paso.
            </p>
            <button
              type="button"
              onClick={startDelete}
              className={`mt-3 text-sm font-medium text-rose-400 underline decoration-rose-500/40 underline-offset-4 hover:text-rose-300 ${FOCUS_RING}`}
            >
              Eliminar mi cuenta…
            </button>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/60"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      <DeleteAccountModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
      />
    </>
  );
}
