/**
 * Account hub: app preferences, session logout, and account deletion.
 */
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { IoClose, IoLogOutOutline } from "react-icons/io5";
import { logout } from "@/lib/session";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useDialogA11y } from "@/lib/use-dialog-a11y";
import { ModalMenuFooter } from "@/components/modal-menu-footer";
import { requestCookieConsentReview } from "@/components/cookie-consent-banner";
import { FOCUS_RING } from "@/lib/ui-a11y";
import {
  isDailyNotificationEnabled,
  setDailyNotificationEnabled,
} from "@/lib/daily-notification-preference";
import { requestNotificationPermission } from "@/lib/daily-notification";
import { registerWebPush, unregisterWebPush } from "@/lib/push-subscription";
import {
  getDensity,
  setDensity,
  subscribeDensity,
  type Density,
} from "@/lib/density-preference";

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
  const [dailyNotify, setDailyNotify] = useState(isDailyNotificationEnabled);
  const [prefError, setPrefError] = useState<string | null>(null);
  const density = useSyncExternalStore(
    subscribeDensity,
    getDensity,
    () => "comfortable" as Density,
  );

  useBodyScrollLock(open);
  useDialogA11y(open, panelRef);

  useEffect(() => {
    if (!open) return;
    setDailyNotify(isDailyNotificationEnabled());
    setPrefError(null);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex touch-none items-end justify-center overflow-hidden bg-black/60 px-3 pb-[max(1rem,var(--gdh-overlay-footer-pad,1rem))] pt-4 sm:items-center sm:px-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="modal-scroll max-h-[min(90vh,100dvh)] w-full max-w-md touch-auto overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-t-2xl border border-[var(--color-border-subtle)] bg-[var(--color-panel)] p-4 shadow-2xl sm:rounded-2xl sm:p-5"
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
            <p className="mt-1 truncate text-sm text-[var(--color-accent)]">{profileName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className={`shrink-0 rounded-lg border border-[var(--color-border)] p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-panel-elevated)]/60 ${FOCUS_RING}`}
          >
            <IoClose className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <p className="mt-4 break-words text-sm leading-relaxed text-[var(--color-text-muted)]">
          {t("account.description")}
        </p>

        <div className="mt-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-dim)]">
            {t("account.prefsTitle")}
          </p>

          {prefError && (
            <div
              className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200"
              role="alert"
            >
              {prefError}
            </div>
          )}

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)]/60 px-3 py-3">
            <input
              type="checkbox"
              checked={dailyNotify}
              className="mt-1 h-4 w-4 rounded border-[var(--color-border-subtle)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
              onChange={async (e) => {
                const on = e.target.checked;
                setPrefError(null);
                if (on) {
                  const perm = await requestNotificationPermission();
                  if (perm !== "granted") {
                    setPrefError(t("account.notifyError"));
                    return;
                  }
                  await registerWebPush();
                } else {
                  await unregisterWebPush();
                }
                setDailyNotificationEnabled(on);
                setDailyNotify(on);
              }}
            />
            <span className="text-sm text-[var(--color-text-muted)]">
              <span className="font-medium text-[var(--color-text)]">
                {t("account.dailyNotifyTitle")}
              </span>
              <span className="mt-0.5 block text-[var(--color-text-muted)]">
                {t("account.dailyNotifyDesc")}
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)]/60 px-3 py-3">
            <input
              type="checkbox"
              checked={density === "compact"}
              className="mt-1 h-4 w-4 rounded border-[var(--color-border-subtle)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
              onChange={(e) => {
                setDensity(e.target.checked ? "compact" : "comfortable");
              }}
            />
            <span className="text-sm text-[var(--color-text-muted)]">
              <span className="font-medium text-[var(--color-text)]">
                {t("account.densityTitle")}
              </span>
              <span className="mt-0.5 block text-[var(--color-text-muted)]">
                {t("account.densityDesc")}
              </span>
            </span>
          </label>

          <button
            type="button"
            onClick={() => {
              onClose();
              requestCookieConsentReview();
            }}
            className={`flex w-full min-h-11 items-center justify-center rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)]/60 px-4 py-3 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-panel-elevated)] hover:text-[var(--color-text)] ${FOCUS_RING}`}
          >
            {t("cookieConsent.manage")}
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            onClose();
            void logout();
          }}
          className={`mt-5 flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)]/60 px-4 py-3 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-panel-elevated)] ${FOCUS_RING}`}
        >
          <IoLogOutOutline className="h-5 w-5 shrink-0" aria-hidden />
          {t("account.logout")}
        </button>

        <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-950/15 p-4 sm:mt-8">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-rose-400/90">
            {t("account.dangerZone")}
          </h3>
          <p className="mt-2 break-words text-sm leading-relaxed text-[var(--color-text-dim)]">
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
