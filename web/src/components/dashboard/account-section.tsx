/** Inline account section — same pattern as Ingresos / Metas (not a modal). */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { IoLogOutOutline } from "react-icons/io5";
import { DeleteAccountModal } from "@/components/delete-account-modal";
import { snapshot, subscribe } from "@/auth";
import { logout } from "@/lib/session";
import { showLegalPage } from "@/lib/legal-pages-state";
import {
  isDailyNotificationEnabled,
  setDailyNotificationEnabled,
} from "@/lib/daily-notification-preference";
import { requestNotificationPermission } from "@/lib/daily-notification";
import {
  confirmWebPush,
  registerWebPush,
  syncWebPush,
  unregisterWebPush,
  type WebPushSync,
} from "@/lib/push-subscription";
import {
  getDensity,
  setDensity,
  subscribeDensity,
  type Density,
} from "@/lib/density-preference";
import {
  canUseOsNotifications,
  getInstallHintPlatform,
  isStandaloneDisplay,
} from "@/lib/pwa-display";
import { TYPE_DISPLAY, TYPE_EYEBROW } from "@/lib/typography";
import { ThemeToggle } from "@/components/theme-toggle";
import { ALERT_CRIT, BTN_SECONDARY, FOCUS_RING, SECTION_CARD } from "@/lib/ui-a11y";

const INSTALL_HINT_DISMISS_KEY = "gdh-install-hint-dismissed";

type Props = {
  profileName: string;
};

export function AccountSection({ profileName }: Props) {
  const { t } = useTranslation();
  const auth = useSyncExternalStore(subscribe, snapshot);
  const founder = auth.user?.lifetime_free !== false;
  const [dailyNotify, setDailyNotify] = useState(isDailyNotificationEnabled);
  const [pushStatus, setPushStatus] = useState<WebPushSync | "idle">("idle");
  const [testFailed, setTestFailed] = useState(false);
  const pushLock = useRef(false);
  const [showInstallHint, setShowInstallHint] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const density = useSyncExternalStore(
    subscribeDensity,
    getDensity,
    () => "comfortable" as Density,
  );

  useEffect(() => {
    const enabled = isDailyNotificationEnabled();
    setDailyNotify(enabled);
    setTestFailed(false);
    const dismissed =
      typeof localStorage !== "undefined" &&
      localStorage.getItem(INSTALL_HINT_DISMISS_KEY) === "1";
    setShowInstallHint(!isStandaloneDisplay() && !dismissed);
    if (!enabled) return;
    let cancelled = false;
    void syncWebPush().then((status) => {
      if (!cancelled) setPushStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const installPlatform = getInstallHintPlatform();
  const installBodyKey =
    installPlatform === "ios"
      ? "account.installBodyIos"
      : installPlatform === "android"
        ? "account.installBodyAndroid"
        : "account.installBodyDesktop";

  async function enableDailyNotify() {
    if (pushLock.current) return;
    pushLock.current = true;
    setTestFailed(false);
    try {
      if (installPlatform === "ios" && !isStandaloneDisplay()) {
        setPushStatus("needs-install");
        return;
      }
      if (!canUseOsNotifications()) {
        setPushStatus("unsupported");
        return;
      }
      const perm = await requestNotificationPermission();
      if (perm === "denied") {
        setPushStatus("denied");
        return;
      }
      if (perm !== "granted") {
        setPushStatus("pending");
        return;
      }
      const subscribed = await registerWebPush();
      if (!subscribed) {
        setPushStatus("pending");
        return;
      }
      setDailyNotificationEnabled(true);
      setDailyNotify(true);
      setPushStatus("subscribed");
      try {
        await confirmWebPush();
      } catch {
        setTestFailed(true);
      }
    } catch {
      setPushStatus("pending");
    } finally {
      pushLock.current = false;
    }
  }

  async function disableDailyNotify() {
    if (pushLock.current) return;
    pushLock.current = true;
    setTestFailed(false);
    try {
      await unregisterWebPush();
    } catch {
      /* The local opt-out still stands if the server is unreachable. */
    } finally {
      setDailyNotificationEnabled(false);
      setDailyNotify(false);
      setPushStatus("idle");
      pushLock.current = false;
    }
  }

  const pushAlert =
    pushStatus === "unsupported"
      ? t("account.notifyUnsupported")
      : pushStatus === "pending" && !dailyNotify
        ? t("account.notifyPushFailed")
        : null;
  const pushNotice = testFailed
    ? t("account.notifyTestFailed")
    : pushStatus === "subscribed" && dailyNotify
      ? t("account.notifySubscribed")
      : pushStatus === "needs-install"
        ? t("account.notifyNeedInstall")
        : pushStatus === "denied"
          ? t("account.notifyDenied")
          : pushStatus === "pending" && dailyNotify
            ? t("account.notifyPending")
            : null;

  return (
    <>
      <section className={`${SECTION_CARD} p-4 sm:p-6`}>
        <div className="mb-5">
          <h2 className={TYPE_DISPLAY}>{t("account.title")}</h2>
          <p className="mt-1 truncate text-sm font-medium text-[var(--color-accent)]">
            {profileName}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
            {t("account.description")}
          </p>
        </div>

        {showInstallHint ? (
          <div
            className="mb-5 rounded-lg border border-[var(--color-accent-border)] bg-[var(--color-accent-dim)] px-4 py-3.5"
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
              className={`mt-3 min-h-11 text-sm font-medium text-[var(--color-accent)] ${FOCUS_RING}`}
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

        <div>
          <p className={TYPE_EYEBROW}>{t("account.prefsTitle")}</p>

          {pushAlert ? (
            <div className={`mt-3 px-3 py-2 ${ALERT_CRIT}`} role="alert">
              {pushAlert}
            </div>
          ) : null}
          {pushNotice ? (
            <div
              className="mt-3 rounded-lg border border-[var(--color-accent-border)] bg-[var(--color-accent-dim)] px-3 py-2 text-sm text-[var(--color-text-muted)]"
              role="status"
            >
              {pushNotice}
            </div>
          ) : null}

          <div className="mt-3 space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3.5">
              <input
                type="checkbox"
                checked={dailyNotify}
                className="mt-1 h-4 w-4 rounded border-[var(--color-border-subtle)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                onChange={(e) => {
                  if (e.target.checked) {
                    void enableDailyNotify();
                    return;
                  }
                  void disableDailyNotify();
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

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3.5">
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

            <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3.5">
              <div className="min-w-0 text-sm text-[var(--color-text-muted)]">
                <p className="font-medium text-[var(--color-text)]">
                  {t("account.themeTitle")}
                </p>
                <p className="mt-1 leading-snug">{t("account.themeDesc")}</p>
              </div>
              <ThemeToggle />
            </div>

          </div>
        </div>

        <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
          <h3 className={TYPE_EYEBROW}>{t("account.planTitle")}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
            {t(founder ? "account.planBodyFounder" : "account.planBody")}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
            {t("account.planEnd")}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => showLegalPage("privacy")}
              className={`w-full ${BTN_SECONDARY}`}
            >
              {t("footer.privacy")}
            </button>
            <button
              type="button"
              onClick={() => showLegalPage("legal")}
              className={`w-full ${BTN_SECONDARY}`}
            >
              {t("footer.legalLink")}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void logout()}
          className={`mt-6 w-full gap-2 ${BTN_SECONDARY}`}
        >
          <IoLogOutOutline className="h-5 w-5 shrink-0" aria-hidden />
          {t("account.logout")}
        </button>

        <div className="mt-6 rounded-lg border border-[var(--color-crit-border)] bg-[var(--color-crit-dim)] p-4">
          <h3 className={`${TYPE_EYEBROW} text-[var(--color-crit)]`}>
            {t("account.dangerZone")}
          </h3>
          <p className="mt-2 break-words text-sm leading-relaxed text-[var(--color-text-dim)]">
            {t("account.dangerDesc")}
          </p>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className={`mt-3 min-h-11 text-left text-sm font-medium text-[var(--color-crit)] hover:opacity-90 ${FOCUS_RING}`}
          >
            {t("account.deleteAccount")}
          </button>
        </div>
      </section>

      <DeleteAccountModal open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </>
  );
}
