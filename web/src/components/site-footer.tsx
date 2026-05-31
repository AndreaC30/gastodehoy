/** Pie legal del dashboard (sin exponer fórmulas internas). */

import { useTranslation } from "react-i18next";
import { showLegalPage } from "@/lib/legal-pages-state";

const CONTACT_EMAIL =
  import.meta.env.VITE_CONTACT_EMAIL?.trim() || "gastodehoy@gmail.com";

export function SiteFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-4 text-center text-xs leading-relaxed text-slate-500">
      <p className="text-slate-400">
        {t("footer.copyright", { year })}
      </p>
      <p className="mt-2">
        {t("footer.legal")}
      </p>
      <p className="mt-2">
        <button
          type="button"
          onClick={() => showLegalPage("privacy")}
          className="text-teal-400/80 underline decoration-teal-500/40 underline-offset-2 hover:text-teal-300"
        >
          {t("footer.privacy")}
        </button>
        {" · "}
        <button
          type="button"
          onClick={() => showLegalPage("legal")}
          className="text-teal-400/80 underline decoration-teal-500/40 underline-offset-2 hover:text-teal-300"
        >
          {t("footer.legalLink")}
        </button>
      </p>
      {CONTACT_EMAIL ? (
        <p className="mt-2">
          {t("footer.contact")}:{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-teal-400/90 underline decoration-teal-500/40 underline-offset-2 hover:text-teal-300"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      ) : null}
    </footer>
  );
}
