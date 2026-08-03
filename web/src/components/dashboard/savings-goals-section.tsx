/** Inline savings goals section — reuses the working panel (Query + PATCH). */

import { useTranslation } from "react-i18next";
import { SavingsGoalsContent } from "@/components/dashboard/savings-goals-panel";
import { TYPE_DISPLAY } from "@/lib/typography";
import type { DashboardSection } from "@/lib/dashboard-state";

type Props = {
  reservedSavings?: string | number;
  onNavigate?: (section: DashboardSection) => void;
};

export function SavingsGoalsSection({ reservedSavings }: Props) {
  const { t } = useTranslation();

  return (
    <section className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-surface)] sm:p-6">
      <div className="mb-5">
        <h2 className={TYPE_DISPLAY}>{t("nav.savingsGoals")}</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {t("savingsGoals.subtitle")}
        </p>
      </div>

      <SavingsGoalsContent reservedSavings={reservedSavings} />
    </section>
  );
}
