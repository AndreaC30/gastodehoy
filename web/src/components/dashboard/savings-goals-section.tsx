/** Inline savings goals section — reuses the working panel (Query + PATCH). */

import { useTranslation } from "react-i18next";
import { IoClose } from "react-icons/io5";
import { SavingsGoalsContent } from "@/components/dashboard/savings-goals-panel";
import { TYPE_DISPLAY } from "@/lib/typography";
import { FOCUS_RING } from "@/lib/ui-a11y";
import type { DashboardSection } from "@/lib/dashboard-state";

type Props = {
  reservedSavings?: string | number;
  onNavigate?: (section: DashboardSection) => void;
};

export function SavingsGoalsSection({ reservedSavings, onNavigate }: Props) {
  const { t } = useTranslation();

  return (
    <section className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-surface)] sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className={TYPE_DISPLAY}>{t("nav.savingsGoals")}</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {t("savingsGoals.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.("hoy")}
          className={`rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-panel-elevated)] hover:text-[var(--color-text)] ${FOCUS_RING}`}
          aria-label={t("common.back", { defaultValue: "Volver" })}
        >
          <IoClose className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <SavingsGoalsContent reservedSavings={reservedSavings} />
    </section>
  );
}
