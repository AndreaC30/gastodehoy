/** First screen of the installed app: choose alerts before hunting in Account. */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { requestNotificationPermission } from "@/lib/daily-notification";
import {
  dismissInstallNotify,
  isDailyNotificationEnabled,
  setDailyNotificationEnabled,
  wasInstallNotifyDismissed,
} from "@/lib/daily-notification-preference";
import { canUseOsNotifications, isStandaloneDisplay } from "@/lib/pwa-display";
import { confirmWebPush, registerWebPush } from "@/lib/push-subscription";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui-a11y";

type Props = {
  /** Hide while the guided tour is covering the screen. */
  paused: boolean;
};

export function InstallNotifyPrompt({ paused }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (paused || !isStandaloneDisplay() || !canUseOsNotifications()) return;
    if (isDailyNotificationEnabled() || wasInstallNotifyDismissed()) return;
    if (!("Notification" in window) || Notification.permission !== "default") return;
    setOpen(true);
  }, [paused]);

  if (!open) return null;

  async function allow() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const perm = await requestNotificationPermission();
      if (perm !== "granted") {
        dismissInstallNotify();
        setError(t("account.notifyDenied"));
        return;
      }
      const subscribed = await registerWebPush();
      if (!subscribed) {
        setError(t("account.notifyPushFailed"));
        return;
      }
      setDailyNotificationEnabled(true);
      try {
        await confirmWebPush();
      } catch {
        /* The device is subscribed; the evening send still runs. */
      }
      setOpen(false);
    } catch {
      setError(t("account.notifyPushFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="rounded-[10px] border border-[var(--color-accent-border)] bg-[var(--color-accent-dim)] px-4 py-3.5"
      role="region"
      aria-label={t("account.notifyPromptTitle")}
    >
      <p className="text-sm font-semibold text-[var(--color-accent)]">
        {t("account.notifyPromptTitle")}
      </p>
      <p className="mt-1.5 text-sm leading-snug text-[var(--color-text-muted)]">
        {t("account.notifyPromptBody")}
      </p>
      {error ? (
        <p className="mt-2 text-sm text-[var(--color-crit)]" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={BTN_PRIMARY}
          disabled={busy}
          onClick={() => void allow()}
        >
          {t("account.notifyPromptAllow")}
        </button>
        <button
          type="button"
          className={BTN_SECONDARY}
          disabled={busy}
          onClick={() => {
            dismissInstallNotify();
            setOpen(false);
          }}
        >
          {t("account.notifyPromptLater")}
        </button>
      </div>
    </div>
  );
}
