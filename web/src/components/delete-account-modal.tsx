/**
 * Confirm account deletion with password (opened from dashboard menu).
 */
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { IoClose } from "react-icons/io5";
import { api } from "@/api/client";
import { setAnonymous } from "@/auth";
import { logout } from "@/lib/session";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { translateBackendError } from "@/lib/backend-errors";
import { useDialogA11y } from "@/lib/use-dialog-a11y";
import { FormField } from "@/components/ui/form-field";
import { ModalMenuFooter } from "@/components/modal-menu-footer";
import { FOCUS_RING } from "@/lib/ui-a11y";

type Props = {
  open: boolean;
  onClose: () => void;
  onBackToMenu?: () => void;
};

export function DeleteAccountModal({ open, onClose, onBackToMenu }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

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
      setError(t("deleteAccount.errorEmpty"));
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
      setError(translateBackendError((e as Error).message, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex touch-none items-end justify-center overflow-hidden bg-black/60 px-3 py-4 sm:items-center sm:px-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="modal-scroll max-h-[min(90vh,100dvh)] w-full max-w-md touch-auto overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-t-2xl border border-rose-500/30 bg-slate-900 p-4 shadow-2xl sm:rounded-2xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2
              id="delete-account-title"
              className="text-lg font-bold tracking-tight text-rose-200"
            >
              {t("deleteAccount.title")}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {t("deleteAccount.subtitle")}
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
            label={t("deleteAccount.passwordLabel")}
            hint={t("deleteAccount.passwordHint")}
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

        <ModalMenuFooter
          className="mt-4"
          onBackToMenu={onBackToMenu}
          onClose={onClose}
          closeLabel={t("deleteAccount.cancel")}
        >
          <button
            type="button"
            onClick={() => void confirmDelete()}
            disabled={busy}
            className={`min-h-11 w-full rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60 sm:w-auto ${FOCUS_RING}`}
          >
            {busy ? t("deleteAccount.deleting") : t("deleteAccount.confirm")}
          </button>
        </ModalMenuFooter>
      </div>
    </div>
  );
}
