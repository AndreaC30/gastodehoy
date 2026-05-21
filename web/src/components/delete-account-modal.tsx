/**
 * Confirm account deletion with password (opened from dashboard menu).
 */
import { useEffect, useRef, useState } from "react";
import { IoClose } from "react-icons/io5";
import { api } from "@/api/client";
import { setAnonymous } from "@/auth";
import { logout } from "@/lib/session";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useDialogA11y } from "@/lib/use-dialog-a11y";
import { FormField } from "@/components/ui/form-field";
import { FOCUS_RING } from "@/lib/ui-a11y";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function DeleteAccountModal({ open, onClose }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(open);
  useDialogA11y(open, panelRef);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  async function confirmDelete() {
    if (!password.trim()) {
      setError("Escribe tu contraseña para confirmar la eliminación.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/me/delete", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      await logout();
      setAnonymous();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex touch-none items-end justify-center overflow-hidden bg-black/60 px-3 py-4 sm:items-center sm:px-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="modal-scroll w-full max-w-md touch-auto overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-t-2xl border border-rose-500/30 bg-slate-900 p-4 shadow-2xl sm:rounded-2xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2
              id="delete-account-title"
              className="text-lg font-bold tracking-tight text-rose-200"
            >
              Eliminar cuenta
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Paso final: se borran todos tus datos de forma permanente. No se puede
              deshacer.
            </p>
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

        {error && (
          <p
            className="mt-3 rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="mt-4">
          <FormField
            id="delete-account-password"
            label="Contraseña actual"
            hint="Confirma que eres tú."
          >
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/40"
            />
          </FormField>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void confirmDelete()}
            disabled={busy}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
          >
            {busy ? "Eliminando…" : "Confirmar eliminación"}
          </button>
        </div>
      </div>
    </div>
  );
}
