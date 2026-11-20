import { useTranslation } from "react-i18next";
import type { Summary } from "@/api/types";
import { BudgetWaterfall } from "@/components/dashboard/budget-waterfall";
import { DaySheet } from "@/components/dashboard/day-sheet";
import { Metric } from "@/components/dashboard/metric";
import { PaceMeter } from "@/components/dashboard/pace-meter";
import { Skeleton } from "@/components/ui/skeleton";
import { money } from "@/lib/format";
import { FOCUS_RING, SECTION_CARD } from "@/lib/ui-a11y";

type Props = {
  summary: Summary | undefined;
  summaryPending: boolean;
  /** Suma de lo anotado hoy. */
  spentToday: number;
  onAddExpense?: () => void;
};

export function DailyHero({
  summary,
  summaryPending,
  spentToday,
  onAddExpense,
}: Props) {
  const { t } = useTranslation();
  const remaining = summary ? Number(summary.remaining_this_month) : undefined;

  return (
    <section
      data-tour="hero"
      /* El tope de alto solo vale con el desglose plegado: abierto, la tarjeta debe crecer con su contenido
         (con el tope fijo, el desglose se salía por debajo de la tarjeta en el móvil). */
      className={`${SECTION_CARD} flex max-h-[40rem] grow flex-col p-4 has-[details[open]]:max-h-none sm:p-5 lg:max-h-none lg:grow-0 lg:p-6`}
      style={{ boxShadow: "inset 3px 0 0 var(--color-accent)" }}
    >
      <div className="lg:grid lg:grid-cols-[minmax(0,0.95fr)_1.35fr] lg:items-start lg:gap-8">
        <div className="space-y-4">
          {summaryPending || !summary ? (
            <div
              className="h-48 w-full animate-pulse rounded-xl bg-[var(--color-panel-elevated)]"
              aria-hidden
            />
          ) : (
            <>
              <DaySheet
                referenceDate={summary.reference_date}
                suggested={Number(summary.suggested_spend_today)}
                spentToday={spentToday}
                onAddExpense={onAddExpense}
              />
              <PaceMeter
                status={summary.pace_status}
                spentPercent={
                  summary.spent_percent == null ? null : Number(summary.spent_percent)
                }
                elapsedPercent={Number(summary.month_elapsed_percent)}
              />
            </>
          )}

          {/* Móvil: dos datos del mes y el desglose plegado. */}
          <div className="lg:hidden">
            <div className="grid grid-cols-2 gap-2.5">
              <Metric
                label={t("metrics.remaining")}
                value={
                  summaryPending ? (
                    <Skeleton className="h-5 w-16" />
                  ) : (
                    money(summary?.remaining_this_month)
                  )
                }
                highlight={remaining != null && remaining >= 0}
                danger={remaining != null && remaining < 0}
              />
              <Metric
                label={t("metrics.daysLeft")}
                value={
                  summaryPending ? (
                    <Skeleton className="h-5 w-8" />
                  ) : summary ? (
                    String(summary.days_remaining_in_month)
                  ) : (
                    "—"
                  )
                }
              />
            </div>
            {summary ? (
              <details className="mt-3 rounded-lg border border-[var(--color-border-subtle)] px-3 py-1">
                <summary
                  className={`flex min-h-11 cursor-pointer items-center text-sm font-medium text-[var(--color-text-muted)] ${FOCUS_RING}`}
                >
                  {t("hero.showBreakdown")}
                </summary>
                <div className="pb-2">
                  <BudgetWaterfall summary={summary} />
                </div>
              </details>
            ) : null}
          </div>
        </div>

        {/* Escritorio: la cascada, siempre visible. */}
        <div className="hidden lg:block">
          {summary ? <BudgetWaterfall summary={summary} /> : null}
        </div>
      </div>
    </section>
  );
}
