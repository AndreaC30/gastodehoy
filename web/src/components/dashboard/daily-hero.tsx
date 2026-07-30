import { useTranslation } from "react-i18next";
import type { Summary } from "@/api/types";
import { Metric } from "@/components/dashboard/metric";
import { money, savingsLabel } from "@/lib/format";
import { useAnimatedNumber } from "@/lib/use-animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import { FOCUS_RING, SECTION_CARD } from "@/lib/ui-a11y";
import { TYPE_BODY, TYPE_EYEBROW, TYPE_HERO_NUMBER } from "@/lib/typography";
import { useState } from "react";

type Props = {
  summary: Summary | undefined;
  summaryPending: boolean;
  onRefresh: () => void;
  onAddExpense?: () => void;
};

export function DailyHero({ summary, summaryPending, onRefresh, onAddExpense }: Props) {
  const { t } = useTranslation();
  const [showMetrics, setShowMetrics] = useState(false);
  const animatedSpend = useAnimatedNumber(
    summary?.suggested_spend_today != null ? Number(summary.suggested_spend_today) : undefined,
  );

  const metrics = (
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
  );

  return (
    <section
      data-tour="hero"
      className={`${SECTION_CARD} overflow-hidden border-[var(--color-accent-border)] p-4 sm:p-5 md:p-5`}
      style={{ boxShadow: "inset 3px 0 0 var(--color-accent)" }}
      aria-live="polite"
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,0.95fr)_1.35fr] md:items-stretch md:gap-6">
        <div className="flex flex-col justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-5 sm:p-5">
          <p className={TYPE_EYEBROW}>{t("hero.dailyBudget")}</p>
          <div className="mt-2 min-h-[3rem] sm:min-h-[2.75rem] md:min-h-[3.25rem]">
            {summaryPending ? (
              <div
                className="h-12 w-44 animate-pulse rounded-lg bg-[var(--color-panel-elevated)] sm:h-10 sm:w-44 md:h-12 md:w-52"
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
              className={`mt-4 flex min-h-12 w-full items-center justify-center rounded-xl border border-[var(--color-accent-border)] bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-bg)] hover:opacity-95 sm:w-auto ${FOCUS_RING}`}
            >
              {t("hero.addExpense")}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onRefresh}
            aria-label={t("hero.refresh")}
            className={`mt-3 min-h-11 w-fit px-1 text-sm font-medium text-[var(--color-text-dim)] underline decoration-[var(--color-border-subtle)] underline-offset-4 hover:text-[var(--color-text-muted)] ${FOCUS_RING}`}
          >
            {t("hero.refresh")}
          </button>

          <button
            type="button"
            className={`mt-3 min-h-11 text-left text-sm font-medium text-[var(--color-accent)] md:hidden ${FOCUS_RING}`}
            onClick={() => setShowMetrics((v) => !v)}
            aria-expanded={showMetrics}
          >
            {showMetrics ? t("hero.hideMetrics") : t("hero.showMetrics")}
          </button>
          {showMetrics ? <div className="mt-3 md:hidden">{metrics}</div> : null}
        </div>

        <div className="hidden md:block">{metrics}</div>
      </div>
      <p className={`mt-4 border-t border-[var(--color-border)] pt-3 ${TYPE_BODY}`}>
        {t("hero.explanation")}
      </p>
    </section>
  );
}
