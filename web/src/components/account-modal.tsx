/**
 * Account hub: app preferences, session logout, and account deletion.
 * Mobile: full-bleed bottom sheet (no floating card). Desktop: centered panel.
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
import {
  getInstallHintPlatform,
  isStandaloneDisplay,
} from "@/lib/pwa-display";

const INSTALL_HINT_DISMISS_KEY = "gdh-install-hint-dismissed";

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
  const [showInstallHint, setShowInstallHint] = useState(false);
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
    const dismissed =
      typeof localStorage !== "undefined" &&
      localStorage.getItem(INSTALL_HINT_DISMISS_KEY) === "1";
    setShowInstallHint(!isStandaloneDisplay() && !dismissed);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const installPlatform = getInstallHintPlatform();
  const installBodyKey =
    installPlatform === "ios"
      ? "account.installBodyIos"
      : installPlatform === "android"
        ? "account.installBodyAndroid"
        : "account.installBodyDesktop";

  return (
    <div
      className="fixed inset-0 z-[70] flex touch-none items-end justify-center overflow-hidden bg-black/60 pt-10 sm:items-center sm:px-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="modal-scroll flex max-h-[min(92dvh,100%)] w-full max-w-lg touch-auto flex-col overflow-hidden rounded-t-2xl border border-[var(--color-border-subtle)] bg-[var(--color-panel)] shadow-2xl sm:max-h-[min(90vh,100dvh)] sm:rounded-2xl"
        style={{
          paddingBottom:
            "max(0.75rem, var(--gdh-overlay-footer-pad, env(safe-area-inset-bottom)))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden" aria-hidden>
          <div className="h-1 w-10 rounded-full bg-[var(--color-border-subtle)]" />
        </div>

        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 pb-4 pt-2 sm:pt-5">
          <div className="min-w-0 flex-1">
            <h2
              id="account-modal-title"
              className="text-lg font-bold tracking-tight"
            >
              {t("account.title")}
            </h2>
            <p className="mt-1 truncate text-sm text-[var(--color-accent)]">
              {profileName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-panel-elevated)]/60 ${FOCUS_RING}`}
          >
            <IoClose className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-5">
          <p className="break-words text-sm leading-relaxed text-[var(--color-text-muted)]">
            {t("account.description")}
          </p>

          {showInstallHint ? (
            <div
              className="mt-5 rounded-xl border border-[var(--color-accent-border)] bg-[var(--color-accent-dim)] px-4 py-3.5"
              role="note"
            >
              <p className="text-sm font-semibold text-[var(--color-accent)]">
                {t("account.installTitle")}
              </p>
              <p className="mt-1.5 text-sm leading-snug text-[var(--color-text-muted)]">
                {t(installBodyKey)}
              </p>
              <button
                type="button"
                className={`mt-3 min-h-10 text-sm font-medium text-[var(--color-accent)] ${FOCUS_RING}`}
                onClick={() => {
                  try {
                    localStorage.setItem(INSTALL_HINT_DISMISS_KEY, "1");
                  } catch {
                    /* ignore */
                  }
                  setShowInstallHint(false);
                }}
              >
                {t("account.installDismiss")}
              </button>
            </div>
          ) : null}

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-dim)]">
              {t("account.prefsTitle")}
            </p>

            {prefError && (
              <div
                className="mt-3 rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200"
                role="alert"
              >
                {prefError}
              </div>
            )}

            <div className="mt-3 space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3.5">
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
                  <span className="mt-1 block leading-snug text-[var(--color-text-muted)]">
                    {t("account.dailyNotifyDesc")}
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3.5">
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
                  <span className="mt-1 block leading-snug text-[var(--color-text-muted)]">
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
                className={`flex min-h-12 w-full items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] ${FOCUS_RING}`}
              >
                {t("cookieConsent.manage")}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              void logout();
            }}
            className={`mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-panel-elevated)] ${FOCUS_RING}`}
          >
            <IoLogOutOutline className="h-5 w-5 shrink-0" aria-hidden />
            {t("account.logout")}
          </button>

          <div className="mt-6 rounded-xl border border-rose-500/25 bg-rose-950/15 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-rose-400/90">
              {t("account.dangerZone")}
            </h3>
            <p className="mt-2 break-words text-sm leading-relaxed text-[var(--color-text-dim)]">
              {t("account.dangerDesc")}
            </p>
            <button
              type="button"
              onClick={onRequestDelete}
              className={`mt-3 min-h-11 text-left text-sm font-medium text-rose-400 hover:text-rose-300 ${FOCUS_RING}`}
            >
              {t("account.deleteAccount")}
            </button>
          </div>

          <ModalMenuFooter className="mt-5" onBackToMenu={onBackToMenu} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
