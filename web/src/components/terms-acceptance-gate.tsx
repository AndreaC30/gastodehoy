/**
 * Bloquea la app hasta que la cuenta acepte la versión vigente.
 * Quien no acepta puede cerrar sesión o eliminar la cuenta.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/api/client";
import type { User } from "@/api/types";
import { DeleteAccountModal } from "@/components/delete-account-modal";
import { LEGAL_TERMS_VERSION } from "@/lib/legal";
import { showLegalPage } from "@/lib/legal-pages-state";
import { logout } from "@/lib/session";
import { translateBackendError } from "@/lib/backend-errors";
import { BTN_PRIMARY, BTN_SECONDARY, SECTION_CARD } from "@/lib/ui-a11y";

type Props = { onDone: (user: User) => void };

export function TermsAcceptanceGate({ onDone }: Props) {
  const { t } = useTranslation();
  const [accepted, setAccepted] = useState(false);
  const [ageOk, setAgeOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function accept() {
    setError(null);
    setBusy(true);
    try {
      const user = await api<User>("/api/auth/accept-terms", {
        method: "POST",
        body: JSON.stringify({
          accepts_terms: true,
          confirms_minimum_age: true,
          terms_version: LEGAL_TERMS_VERSION,
        }),
      });
      onDone(user);
    } catch (err) {
      setError(translateBackendError((err as Error).message, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative z-10 mx-auto flex min-h-full w-full max-w-lg flex-col px-4 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <section className={`my-auto w-full ${SECTION_CARD} p-5 sm:p-6`}>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">{t("termsGate.title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
          {t("termsGate.body", { version: LEGAL_TERMS_VERSION })}
        </p>
        <p className="mt-3 text-sm">
          <button
            type="button"
            onClick={() => showLegalPage("privacy")}
            className="text-[var(--color-accent)] underline"
          >
            {t("login.privacyPolicy")}
          </button>
          {" · "}
          <button
            type="button"
            onClick={() => showLegalPage("legal")}
            className="text-[var(--color-accent)] underline"
          >
            {t("login.termsOfUse")}
          </button>
        </p>
        <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-[var(--color-text-muted)]">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
          />
          <span>{t("termsGate.acceptTerms")}</span>
        </label>
        <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-[var(--color-text-muted)]">
          <input
            type="checkbox"
            checked={ageOk}
            onChange={(e) => setAgeOk(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
          />
          <span>{t("login.ageConfirm")}</span>
        </label>
        {error ? <p className="mt-3 text-sm text-[var(--color-crit)]">{error}</p> : null}
        <button
          type="button"
          disabled={busy || !accepted || !ageOk}
          onClick={() => void accept()}
          className={`mt-5 w-full ${BTN_PRIMARY}`}
        >
          {busy ? t("termsGate.saving") : t("termsGate.accept")}
        </button>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => void logout()} className={`w-full ${BTN_SECONDARY}`}>
            {t("account.logout")}
          </button>
          <button type="button" onClick={() => setDeleteOpen(true)} className={`w-full ${BTN_SECONDARY}`}>
            {t("account.deleteAccount")}
          </button>
        </div>
      </section>
      <DeleteAccountModal open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  );
}
