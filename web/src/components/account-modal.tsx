/**
 * Account hub: app preferences, session logout, and account deletion.
 */
import { useTranslation } from "react-i18next";
import { useEffect, useState, useSyncExternalStore } from "react";
import { IoLogOutOutline } from "react-icons/io5";
import { logout } from "@/lib/session";
import { ModalMenuFooter } from "@/components/modal-menu-footer";
import { AppSheet } from "@/components/ui/app-sheet";
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
  const { t } = useTranslation();
  const [dailyNotify, setDailyNotify] = useState(isDailyNotificationEnabled);
  const [prefError, setPrefError] = useState<string | null>(null);
  const [showInstallHint, setShowInstallHint] = useState(false);
  const density = useSyncExternalStore(
    subscribeDensity,
    getDensity,
    () => "comfortable" as Density,
  );

  useEffect(() => {
    if (!open) return;
    setDailyNotify(isDailyNotificationEnabled());
    setPrefError(null);
    const dismissed =
      typeof localStorage !== "undefined" &&
      localStorage.getItem(INSTALL_HINT_DISMISS_KEY) === "1";
    setShowInstallHint(!isStandaloneDisplay() && !dismissed);
  }, [open]);

  const installPlatform = getInstallHintPlatform();
  const installBodyKey =
    installPlatform === "ios"
      ? "account.installBodyIos"
      : installPlatform === "android"
        ? "account.installBodyAndroid"
        : "account.installBodyDesktop";

  return (
    <AppSheet
      open={open}
      onClose={onClose}
      title={t("account.title")}
      subtitle={
        <span className="truncate text-[var(--color-accent)]">{profileName}</span>
      }
      zClass="z-[70]"
      footer={
        <ModalMenuFooter onBackToMenu={onBackToMenu} onClose={onClose} />
      }
    >
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
            className="mt-3 rounded-xl border border-[var(--color-crit-border)] bg-[var(--color-crit-dim)] px-3 py-2 text-sm text-[var(--color-crit)]"
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

      <div className="mt-6 rounded-xl border border-[var(--color-crit-border)] bg-[var(--color-crit-dim)] p-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-crit)]">
          {t("account.dangerZone")}
        </h3>
        <p className="mt-2 break-words text-sm leading-relaxed text-[var(--color-text-dim)]">
          {t("account.dangerDesc")}
        </p>
        <button
          type="button"
          onClick={onRequestDelete}
          className={`mt-3 min-h-11 text-left text-sm font-medium text-[var(--color-crit)] hover:opacity-90 ${FOCUS_RING}`}
        >
          {t("account.deleteAccount")}
        </button>
      </div>
    </AppSheet>
  );
}
