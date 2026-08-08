/**
 * Pantalla bloqueante tras login con contraseña temporal (recuperación por correo).
 */
import { useTranslation } from "react-i18next";
import { type FormEvent, useState } from "react";
import { api } from "@/api/client";
import type { User } from "@/api/types";
import { logout } from "@/lib/session";
import { translateBackendError } from "@/lib/backend-errors";
import { SECTION_CARD } from "@/lib/ui-a11y";

type Props = {
  onDone: (user: User) => void;
};

export function ForcePasswordChangeModal({ onDone }: Props) {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError(t("forcePassword.passwordError"));
      return;
    }
    if (newPassword !== newPassword2) {
      setError(t("forcePassword.mismatchError"));
      return;
    }
    setBusy(true);
    try {
      const u = await api<User>("/api/auth/me/password", {
        method: "PUT",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      onDone(u);
    } catch (err) {
      setError(translateBackendError((err as Error).message, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative z-10 flex w-full flex-col items-center px-4 py-6 sm:min-h-screen sm:justify-center sm:py-12">
      <div className={`w-full max-w-md ${SECTION_CARD} p-6`}>
        <h2 className="text-xl font-bold tracking-tight">
          {t("forcePassword.title")}
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {t("forcePassword.description")}
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-[var(--color-crit-border)] bg-[var(--color-crit-dim)] px-3 py-2 text-sm text-[var(--color-crit)]">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block text-sm font-medium text-[var(--color-text-muted)]">
            {t("forcePassword.tempPassword")}
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg)] px-3 py-2.5 outline-none focus:border-[var(--color-accent-border)] focus:ring-2 focus:ring-[var(--color-accent-dim)]"
            />
          </label>
          <label className="block text-sm font-medium text-[var(--color-text-muted)]">
            {t("forcePassword.newPassword")}
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg)] px-3 py-2.5 outline-none focus:border-[var(--color-accent-border)] focus:ring-2 focus:ring-[var(--color-accent-dim)]"
            />
          </label>
          <label className="block text-sm font-medium text-[var(--color-text-muted)]">
            {t("forcePassword.repeatPassword")}
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg)] px-3 py-2.5 outline-none focus:border-[var(--color-accent-border)] focus:ring-2 focus:ring-[var(--color-accent-dim)]"
            />
          </label>

          <button
            type="submit"
            disabled={
              busy ||
              !currentPassword ||
              !newPassword ||
              !newPassword2
            }
            className="mt-2 w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--color-accent-ink)] hover:brightness-110 disabled:opacity-60"
          >
            {busy ? t("forcePassword.saving") : t("forcePassword.save")}
          </button>
        </form>

        <button
          type="button"
          onClick={() => void logout()}
          className="mt-4 w-full text-center text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text-muted)]"
        >
          {t("forcePassword.logout")}
        </button>
      </div>
    </div>
  );
}
