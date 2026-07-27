/** Pie legal del dashboard (sin exponer fórmulas internas). */

import { useTranslation } from "react-i18next";
import { showLegalPage } from "@/lib/legal-pages-state";

const CONTACT_EMAIL =
  import.meta.env.VITE_CONTACT_EMAIL?.trim() || "gastodehoy@gmail.com";

export function SiteFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-panel)]/30 px-4 py-4 text-center text-xs leading-relaxed text-[var(--color-text-dim)]">
      <p className="text-[var(--color-text-muted)]">
        {t("footer.copyright", { year })}
      </p>
      <p className="mt-2">
        {t("footer.legal")}
      </p>
      <p className="mt-2">
        <button
          type="button"
          onClick={() => showLegalPage("privacy")}
          className="text-[var(--color-accent)]/80 underline decoration-[var(--color-accent-border)] underline-offset-2 hover:text-[var(--color-accent)]"
        >
          {t("footer.privacy")}
        </button>
        {" · "}
        <button
          type="button"
          onClick={() => showLegalPage("legal")}
          className="text-[var(--color-accent)]/80 underline decoration-[var(--color-accent-border)] underline-offset-2 hover:text-[var(--color-accent)]"
        >
          {t("footer.legalLink")}
        </button>
      </p>
      {CONTACT_EMAIL ? (
        <p className="mt-2">
          {t("footer.contact")}:{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-[var(--color-accent)]/90 underline decoration-[var(--color-accent-border)] underline-offset-2 hover:text-[var(--color-accent)]"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      ) : null}
    </footer>
  );
}
