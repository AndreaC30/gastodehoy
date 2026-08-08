/**
 * Confirm account deletion with password (opened from dashboard menu).
 */
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { api } from "@/api/client";
import { setAnonymous } from "@/auth";
import { logout } from "@/lib/session";
import { translateBackendError } from "@/lib/backend-errors";
import { FormField } from "@/components/ui/form-field";
import { AppSheet } from "@/components/ui/app-sheet";
import { BTN_SECONDARY, FOCUS_RING, INPUT_CLASS } from "@/lib/ui-a11y";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function DeleteAccountModal({ open, onClose }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) {
      setPassword("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

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
    <AppSheet
      open={open}
      onClose={onClose}
      title={t("deleteAccount.title")}
      subtitle={t("deleteAccount.subtitle")}
      zClass="z-[80]"
      danger
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>
            {t("deleteAccount.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void confirmDelete()}
            disabled={busy}
            className={`min-h-11 rounded-lg bg-[var(--color-crit)] px-4 py-2 text-sm font-semibold text-[var(--color-bg)] hover:opacity-90 disabled:opacity-60 ${FOCUS_RING}`}
          >
            {busy ? t("deleteAccount.deleting") : t("deleteAccount.confirm")}
          </button>
        </div>
      }
    >
      {error && (
        <p
          className="mb-4 rounded-xl border border-[var(--color-crit-border)] bg-[var(--color-crit-dim)] px-3 py-2 text-sm text-[var(--color-crit)]"
          role="alert"
        >
          {error}
        </p>
      )}

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
          className={INPUT_CLASS}
        />
      </FormField>
    </AppSheet>
  );
}
