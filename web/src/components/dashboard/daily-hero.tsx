import { useTranslation } from "react-i18next";
import type { Summary } from "@/api/types";
import { Metric } from "@/components/dashboard/metric";
import { money, savingsLabel } from "@/lib/format";
import { useAnimatedNumber } from "@/lib/use-animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import { BTN_PRIMARY, FOCUS_RING, SECTION_CARD } from "@/lib/ui-a11y";
import { TYPE_BODY, TYPE_EYEBROW, TYPE_HERO_NUMBER } from "@/lib/typography";

type Props = {
  summary: Summary | undefined;
  summaryPending: boolean;
  onRefresh: () => void;
  onAddExpense?: () => void;
};

export function DailyHero({
  summary,
  summaryPending,
  onRefresh,
  onAddExpense,
}: Props) {
  const { t } = useTranslation();
  const animatedSpend = useAnimatedNumber(
    summary?.suggested_spend_today != null ? Number(summary.suggested_spend_today) : undefined,
  );

  const metrics = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
      <Metric
        compact
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
        compact
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
        compact
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
        compact
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
        compact
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
        compact
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
  );

  return (
    <section
      data-tour="hero"
      className={`${SECTION_CARD} overflow-hidden p-4 sm:p-5 lg:p-6`}
      style={{ boxShadow: "inset 3px 0 0 var(--color-accent)" }}
      aria-live="polite"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_1.35fr] lg:items-stretch lg:gap-8">
        <div className="flex flex-col justify-center">
          <p className={TYPE_EYEBROW}>{t("hero.dailyBudget")}</p>
          <div className="mt-1 min-h-[2.75rem] lg:mt-3 lg:min-h-[3.25rem]">
            {summaryPending ? (
              <div
                className="h-12 w-44 animate-pulse rounded-lg bg-[var(--color-panel-elevated)]"
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

          <div className="mt-3 flex items-center gap-2 lg:mt-6">
            {onAddExpense ? (
              <button
                type="button"
                onClick={onAddExpense}
                className={`min-w-0 flex-1 lg:flex-none ${BTN_PRIMARY}`}
              >
                {t("hero.addExpense")}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onRefresh}
              aria-label={t("hero.refresh")}
              className={`min-h-11 shrink-0 px-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] ${FOCUS_RING}`}
            >
              {t("hero.refresh")}
            </button>
          </div>

          <div className="mt-3 lg:hidden">{metrics}</div>
        </div>

        <div className="hidden lg:block">{metrics}</div>
      </div>

      <p className={`mt-3 border-t border-[var(--color-border)] pt-3 lg:mt-6 lg:pt-4 ${TYPE_BODY}`}>
        {t("hero.explanation")}
      </p>
    </section>
  );
}
