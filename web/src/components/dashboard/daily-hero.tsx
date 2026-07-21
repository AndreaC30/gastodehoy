import { useTranslation } from "react-i18next";
import type { Summary } from "@/api/types";
import { Metric } from "@/components/dashboard/metric";
import { money, savingsLabel } from "@/lib/format";
import { useAnimatedNumber } from "@/lib/use-animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import { FOCUS_RING } from "@/lib/ui-a11y";
import { TYPE_BODY, TYPE_EYEBROW } from "@/lib/typography";

type Props = {
  summary: Summary | undefined;
  summaryPending: boolean;
  onRefresh: () => void;
};

export function DailyHero({ summary, summaryPending, onRefresh }: Props) {
  const { t } = useTranslation();
  const animatedSpend = useAnimatedNumber(
    summary?.suggested_spend_today != null ? Number(summary.suggested_spend_today) : undefined,
  );

  return (
    <section
      data-tour="hero"
      className="overflow-hidden rounded-xl border border-teal-500/20 bg-gradient-to-br from-slate-900/90 to-slate-900 p-4 shadow-xl shadow-black/30 sm:rounded-2xl sm:p-5 md:p-6"
      aria-live="polite"
    >
      <div className="grid gap-4 sm:gap-6 md:grid-cols-[1fr_1.35fr] md:items-stretch md:gap-8">
        <div className="flex flex-col justify-center rounded-lg border border-slate-800 bg-slate-900 p-4 sm:rounded-xl sm:p-5">
          <p className={TYPE_EYEBROW}>{t("hero.dailyBudget")}</p>
          <div className="mt-1 min-h-[2.25rem] sm:min-h-[2.75rem] md:min-h-[3.5rem]">
            {summaryPending ? (
              <div
                className="h-8 w-36 animate-pulse rounded-lg bg-slate-700/40 sm:h-10 sm:w-44 md:h-14 md:w-52"
                aria-hidden
              />
            ) : (
              <p
                className="break-words text-2xl font-bold tabular-nums tracking-tight text-teal-400 min-[375px]:text-3xl sm:text-4xl md:text-5xl"
                aria-label={
                  summary?.suggested_spend_today != null
                    ? money(summary.suggested_spend_today)
                    : undefined
                }
              >
                {animatedSpend}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onRefresh}
            aria-label={t("hero.refresh")}
            className={`mt-2 min-h-11 w-fit px-1 text-sm font-medium text-slate-400 underline decoration-slate-600 underline-offset-4 hover:text-slate-300 sm:mt-3 ${FOCUS_RING}`}
          >
            {t("hero.refresh")}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5">
          <Metric
            label={t("metrics.savings")}
            value={
              summaryPending ? (
                <Skeleton className="h-5 w-20" />
              ) : summary ? (
                savingsLabel(
                  summary.savings_amount,
                  summary.savings_percent,
                  summary.savings_mode,
                )
              ) : (
                "—"
              )
            }
          />
          <Metric
            label={t("metrics.fixedExpenses")}
            value={
              summaryPending ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                money(summary?.fixed_expenses_total)
              )
            }
          />
          <Metric
            label={t("metrics.variableExpenses")}
            value={
              summaryPending ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                money(summary?.variable_spent_month)
              )
            }
          />
          <Metric
            label={t("metrics.extraIncome")}
            value={
              summaryPending ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                money(summary?.extra_income_month)
              )
            }
          />
          <Metric
            label={t("metrics.remaining")}
            value={
              summaryPending ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                money(summary?.remaining_this_month)
              )
            }
            highlight
          />
          <Metric
            label={t("metrics.daysLeft")}
            value={
              summaryPending ? (
                <Skeleton className="h-5 w-8" />
              ) : summary?.days_remaining_in_month != null ? (
                String(summary.days_remaining_in_month)
              ) : (
                "—"
              )
            }
          />
        </div>
      </div>
      <p className={`mt-5 border-t border-slate-800 pt-4 ${TYPE_BODY}`}>
        {t("hero.explanation")}
      </p>
    </section>
  );
}
