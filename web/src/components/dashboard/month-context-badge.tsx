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
      className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-xl border border-slate-800/80 bg-slate-900/60 px-3 py-2 sm:px-4"
      aria-label={`${monthYear}, ${t("monthContext.badgeSubtitle")}`}
    >
      <p className="text-base font-bold tracking-tight text-slate-100 normal-case sm:text-lg">
        {monthYear}
      </p>
      <p className={TYPE_CAPTION}>{t("monthContext.badgeSubtitle")}</p>
    </div>
  );
}
