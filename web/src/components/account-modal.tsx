/**
 * Account hub: session logout and link to account deletion (step 1 of 2).
 */
import { useTranslation } from "react-i18next";
import { useEffect, useRef } from "react";
import { IoClose, IoLogOutOutline } from "react-icons/io5";
import { logout } from "@/lib/session";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useDialogA11y } from "@/lib/use-dialog-a11y";
import { ModalMenuFooter } from "@/components/modal-menu-footer";
import { FOCUS_RING } from "@/lib/ui-a11y";

type Props = {
  open: boolean;
  profileName: string;
  onClose: () => void;
  onBackToMenu?: () => void;
  onRequestDelete: () => void;
};

export function AccountModal({
  open,
  profileName,
  onClose,
  onBackToMenu,
  onRequestDelete,
}: Props) {
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

  if (!open) return null;

  return (
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
        className="modal-scroll max-h-[min(90vh,100dvh)] w-full max-w-md touch-auto overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-t-2xl border border-slate-800 bg-slate-900 p-4 shadow-2xl sm:rounded-2xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2
              id="account-modal-title"
              className="text-lg font-bold tracking-tight"
            >
              {t("account.title")}
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

        <p className="mt-4 break-words text-sm leading-relaxed text-slate-400">
          {t("account.description")}
        </p>

        <button
          type="button"
          onClick={() => {
            onClose();
            void logout();
          }}
          className={`mt-5 flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 ${FOCUS_RING}`}
        >
          <IoLogOutOutline className="h-5 w-5 shrink-0" aria-hidden />
          {t("account.logout")}
        </button>

        <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-950/15 p-4 sm:mt-8">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-rose-400/90">
            {t("account.dangerZone")}
          </h3>
          <p className="mt-2 break-words text-sm leading-relaxed text-slate-500">
            {t("account.dangerDesc")}
          </p>
          <button
            type="button"
            onClick={onRequestDelete}
            className={`mt-3 min-h-11 text-left text-sm font-medium text-rose-400 underline decoration-rose-500/40 underline-offset-4 hover:text-rose-300 ${FOCUS_RING}`}
          >
            {t("account.deleteAccount")}
          </button>
        </div>

        <ModalMenuFooter className="mt-4" onBackToMenu={onBackToMenu} onClose={onClose} />
      </div>
    </div>
  );
}
