/** Inline tour section — starts the guided tour overlay on the live dashboard. */

import { useTranslation } from "react-i18next";
import { IoPlay } from "react-icons/io5";
import { TYPE_DISPLAY } from "@/lib/typography";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui-a11y";
import type { DashboardSection } from "@/lib/dashboard-state";

type Props = {
  onStart: () => void;
  onNavigate?: (section: DashboardSection) => void;
};

export function TourSection({ onStart, onNavigate }: Props) {
  const { t } = useTranslation();

  return (
    <section className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-surface)] sm:p-6">
      <div className="mb-6">
        <h2 className={TYPE_DISPLAY}>{t("nav.guidedTour")}</h2>
      </div>

      <div className="space-y-6 py-4 text-center sm:py-8">
        <div>
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[10px] bg-[var(--color-accent-dim)]">
            <IoPlay className="h-10 w-10 text-[var(--color-accent)]" aria-hidden />
          </div>
          <h3 className="mb-2 font-display text-lg font-semibold text-[var(--color-text)]">
            {t("tour.introTitle", { defaultValue: "¿Nuevo en GastoDeHoy?" })}
          </h3>
          <p className="mx-auto max-w-md text-sm text-[var(--color-text-muted)]">
            {t("nav.guidedTourDesc")}
          </p>
        </div>

        <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
          <button type="button" onClick={onStart} className={BTN_PRIMARY}>
            <IoPlay className="mr-2 h-4 w-4" aria-hidden />
            {t("tour.start", { defaultValue: "Iniciar tour guiado" })}
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.("hoy")}
            className={BTN_SECONDARY}
          >
            {t("common.back", { defaultValue: "Volver" })}
          </button>
        </div>
      </div>
    </section>
  );
}
