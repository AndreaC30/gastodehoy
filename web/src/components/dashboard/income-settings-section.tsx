/** Inline income settings — same pattern as Metas / Categorías (not a modal). */

import { useTranslation } from "react-i18next";
import { IoClose } from "react-icons/io5";
import type { ExtraIncome, Settings } from "@/api/types";
import { IncomeSettingsContent } from "@/components/dashboard/income-settings-content";
import type { DashboardSection } from "@/lib/dashboard-state";
import { TYPE_DISPLAY } from "@/lib/typography";
import { FOCUS_RING } from "@/lib/ui-a11y";

type Props = {
  settings: Settings;
  extras: ExtraIncome[];
  onSave: () => void;
  onExtrasChanged: () => void;
  onNavigate?: (section: DashboardSection) => void;
};

export function IncomeSettingsSection({
  settings,
  extras,
  onSave,
  onExtrasChanged,
  onNavigate,
}: Props) {
  const { t } = useTranslation();

  return (
    <section className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-surface)] sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className={TYPE_DISPLAY}>{t("nav.yourIncome")}</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {t("incomeSettings.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.("hoy")}
          className={`rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-panel-elevated)] hover:text-[var(--color-text)] ${FOCUS_RING}`}
          aria-label={t("common.close")}
        >
          <IoClose className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <IncomeSettingsContent
        initial={settings}
        extras={extras}
        variant="page"
        idPrefix="income-page"
        onSaved={() => onSave()}
        onExtrasChanged={onExtrasChanged}
      />
    </section>
  );
}
