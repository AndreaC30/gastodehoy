/**
 * Pantalla bloqueante tras login con contraseña temporal (recuperación por correo).
 */
import { useTranslation } from "react-i18next";
import { type FormEvent, useState } from "react";
import { api } from "@/api/client";
import type { User } from "@/api/types";
import { logout } from "@/lib/session";
import { translateBackendError } from "@/lib/backend-errors";

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
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-black/30">
        <h2 className="text-xl font-bold tracking-tight">
          {t("forcePassword.title")}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {t("forcePassword.description")}
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block text-sm font-medium text-slate-400">
            {t("forcePassword.tempPassword")}
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/40"
            />
          </label>
          <label className="block text-sm font-medium text-slate-400">
            {t("forcePassword.newPassword")}
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/40"
            />
          </label>
          <label className="block text-sm font-medium text-slate-400">
            {t("forcePassword.repeatPassword")}
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/40"
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
            className="mt-2 w-full rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-60"
          >
            {busy ? t("forcePassword.saving") : t("forcePassword.save")}
          </button>
        </form>

        <button
          type="button"
          onClick={() => void logout()}
          className="mt-4 w-full text-center text-xs text-slate-500 hover:text-slate-300"
        >
          {t("forcePassword.logout")}
        </button>
      </div>
    </div>
  );
}
