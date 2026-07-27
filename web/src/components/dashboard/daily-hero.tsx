import { useTranslation } from "react-i18next";
import type { Summary } from "@/api/types";
import { Metric } from "@/components/dashboard/metric";
import { money, savingsLabel } from "@/lib/format";
import { useAnimatedNumber } from "@/lib/use-animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import { FOCUS_RING, SECTION_CARD } from "@/lib/ui-a11y";
import { TYPE_BODY, TYPE_EYEBROW, TYPE_HERO_NUMBER } from "@/lib/typography";

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
      className={`${SECTION_CARD} overflow-hidden border-[var(--color-accent-border)] p-4 sm:p-5 md:p-5`}
      style={{ boxShadow: "inset 3px 0 0 var(--color-accent)" }}
      aria-live="polite"
    >
      <div className="grid gap-4 sm:gap-5 md:grid-cols-[minmax(0,0.95fr)_1.35fr] md:items-stretch md:gap-6">
        <div className="flex flex-col justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4 sm:p-5">
          <p className={TYPE_EYEBROW}>{t("hero.dailyBudget")}</p>
          <div className="mt-1 min-h-[2.25rem] sm:min-h-[2.75rem] md:min-h-[3.25rem]">
            {summaryPending ? (
              <div
                className="h-8 w-36 animate-pulse rounded-lg bg-[var(--color-panel-elevated)] sm:h-10 sm:w-44 md:h-12 md:w-52"
                aria-hidden
              />
            ) : (
              <p
                className={TYPE_HERO_NUMBER}
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
            className={`mt-2 min-h-11 w-fit px-1 text-sm font-medium text-[var(--color-text-dim)] underline decoration-[var(--color-border-subtle)] underline-offset-4 hover:text-[var(--color-text-muted)] sm:mt-3 ${FOCUS_RING}`}
          >
            {t("hero.refresh")}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2">
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
      <p className={`mt-4 border-t border-[var(--color-border)] pt-3 ${TYPE_BODY}`}>
        {t("hero.explanation")}
      </p>
    </section>
  );
}
