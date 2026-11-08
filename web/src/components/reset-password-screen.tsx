/**
 * Formulario del enlace de un solo uso (/reset-password?token=…).
 * No inicia sesión: al terminar vuelve al login con la contraseña nueva.
 */
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/api/client";
import { BrandLogo } from "@/components/brand-logo";
import { LoadingSplash } from "@/components/loading-splash";
import { translateBackendError } from "@/lib/backend-errors";
import { useBootSplashGate } from "@/lib/use-boot-splash-gate";
import { ALERT_CRIT, BTN_PRIMARY, INPUT_CLASS, SECTION_CARD } from "@/lib/ui-a11y";

export function ResetPasswordScreen({ token }: { token: string }) {
  const holdSplash = useBootSplashGate(true);
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t("login.passwordMinError"));
      return;
    }
    if (new TextEncoder().encode(password).length > 72) {
      setError(t("login.passwordTooLong"));
      return;
    }
    if (password !== password2) {
      setError(t("login.passwordMismatch"));
      return;
    }
    setBusy(true);
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password: password }),
      });
      window.location.assign("/");
    } catch (err) {
      setError(translateBackendError((err as Error).message, t));
      setBusy(false);
    }
  }

  if (holdSplash) return <LoadingSplash />;

  return (
    <div className="relative z-10 flex min-h-full w-full flex-col items-center px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:justify-center sm:py-12">
      <div className="w-full max-w-md">
        <h1 className="m-0 leading-none">
          <BrandLogo variant="hero" />
        </h1>
        <div className={`mt-6 ${SECTION_CARD} p-5`}>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight">{t("login.resetTitle")}</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">{t("login.resetDesc")}</p>
            </div>
            {error && (
              <div className={`${ALERT_CRIT} px-4 py-3`} role="alert">
                {error}
              </div>
            )}
            <label className="block text-sm font-medium text-[var(--color-text-muted)]" htmlFor="reset-password">
              {t("login.newPassword")}
            </label>
            <input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${INPUT_CLASS} px-3 py-2.5`}
            />
            <label className="block text-sm font-medium text-[var(--color-text-muted)]" htmlFor="reset-password-2">
              {t("login.passwordConfirm")}
            </label>
            <input
              id="reset-password-2"
              type="password"
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className={`${INPUT_CLASS} px-3 py-2.5`}
            />
            <button type="submit" disabled={busy || !password || !password2} className={`w-full ${BTN_PRIMARY}`}>
              {busy ? t("login.resetSaving") : t("login.resetSubmit")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
