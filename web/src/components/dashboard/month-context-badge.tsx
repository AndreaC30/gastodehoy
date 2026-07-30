import { useTranslation } from "react-i18next";
import { budgetReferenceDate, capitalizeFirstLetter, formatMonthYear } from "@/lib/month-context";
import { TYPE_CAPTION } from "@/lib/typography";

type Props = {
  /** From GET /api/summary `reference_date` (app timezone). */
  referenceDate?: string;
};

/** Always-visible month label so the dashboard scope is obvious. */
export function MonthContextBadge({ referenceDate }: Props) {
  const { t, i18n } = useTranslation();
  const ref = budgetReferenceDate(referenceDate);
  const monthYear = capitalizeFirstLetter(formatMonthYear(ref, i18n.language));

  return (
    <div
      className="flex flex-wrap items-baseline gap-x-2 gap-y-0 rounded-lg border border-[var(--color-border)]/80 bg-[var(--color-panel)]/40 px-2.5 py-1.5 sm:rounded-xl sm:px-4 sm:py-2"
      data-tour="month-context"
      aria-label={`${monthYear}, ${t("monthContext.badgeSubtitle")}`}
    >
      <p className="text-sm font-semibold tracking-tight text-[var(--color-text)] normal-case sm:text-lg sm:font-bold">
        {monthYear}
      </p>
      <p className={`hidden sm:inline ${TYPE_CAPTION}`}>{t("monthContext.badgeSubtitle")}</p>
    </div>
  );
}
