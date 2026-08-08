import { useTranslation } from "react-i18next";
import type { Summary } from "@/api/types";
import { Metric } from "@/components/dashboard/metric";
import { money, savingsLabel } from "@/lib/format";
import { useAnimatedNumber } from "@/lib/use-animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import { BTN_PRIMARY, FOCUS_RING, SECTION_CARD } from "@/lib/ui-a11y";
import { TYPE_BODY, TYPE_EYEBROW, TYPE_HERO_NUMBER } from "@/lib/typography";
import { useState } from "react";

type Props = {
  summary: Summary | undefined;
  summaryPending: boolean;
  onRefresh: () => void;
  onAddExpense?: () => void;
  /** Optional month label rendered inside the hero (avoids a separate cramped card). */
  monthLabel?: string;
};

export function DailyHero({
  summary,
  summaryPending,
  onRefresh,
  onAddExpense,
  monthLabel,
}: Props) {
  const { t } = useTranslation();
  const [showMetrics, setShowMetrics] = useState(false);
  const animatedSpend = useAnimatedNumber(
    summary?.suggested_spend_today != null ? Number(summary.suggested_spend_today) : undefined,
  );

  const metrics = (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
  );

  return (
    <section
      data-tour="hero"
      className={`${SECTION_CARD} overflow-hidden p-5 sm:p-6`}
      style={{ boxShadow: "inset 3px 0 0 var(--color-accent)" }}
      aria-live="polite"
    >
      {monthLabel ? (
        <p className="mb-4 text-sm font-medium text-[var(--color-text-muted)] md:hidden">
          {monthLabel}
        </p>
      ) : null}

      <div className="grid gap-6 md:grid-cols-[minmax(0,0.95fr)_1.35fr] md:items-stretch md:gap-8">
        <div className="flex flex-col justify-center">
          <p className={TYPE_EYEBROW}>{t("hero.dailyBudget")}</p>
          <div className="mt-3 min-h-[3.25rem]">
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

          {onAddExpense ? (
            <button
              type="button"
              onClick={onAddExpense}
              className={`mt-6 w-full md:w-auto ${BTN_PRIMARY}`}
            >
              {t("hero.addExpense")}
            </button>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={onRefresh}
              aria-label={t("hero.refresh")}
              className={`min-h-11 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] ${FOCUS_RING}`}
            >
              {t("hero.refresh")}
            </button>
            <button
              type="button"
              className={`min-h-11 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] md:hidden ${FOCUS_RING}`}
              onClick={() => setShowMetrics((v) => !v)}
              aria-expanded={showMetrics}
            >
              {showMetrics ? t("hero.hideMetrics") : t("hero.showMetrics")}
            </button>
          </div>

          {showMetrics ? <div className="mt-5 md:hidden">{metrics}</div> : null}
        </div>

        <div className="hidden md:block">{metrics}</div>
      </div>

      <p className={`mt-6 border-t border-[var(--color-border)] pt-4 ${TYPE_BODY}`}>
        {t("hero.explanation")}
      </p>
    </section>
  );
}
