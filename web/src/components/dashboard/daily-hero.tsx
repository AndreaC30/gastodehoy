import type { Summary } from "@/api/types";
import { Metric } from "@/components/dashboard/metric";
import { money, savingsLabel } from "@/lib/format";
import { FOCUS_RING } from "@/lib/ui-a11y";

type Props = {
  summary: Summary | undefined;
  summaryPending: boolean;
  onRefresh: () => void;
};

export function DailyHero({ summary, summaryPending, onRefresh }: Props) {
  return (
    <section
      className="overflow-hidden rounded-xl border border-teal-500/20 bg-gradient-to-br from-slate-900/90 to-slate-900 p-4 shadow-xl shadow-black/30 sm:rounded-2xl sm:p-5 md:p-6"
      aria-live="polite"
    >
      <div className="grid gap-4 sm:gap-6 md:grid-cols-[1fr_1.35fr] md:items-stretch md:gap-8">
        <div className="flex flex-col justify-center rounded-lg border border-slate-800 bg-slate-900/80 p-4 sm:rounded-xl sm:p-5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:text-[0.72rem]">
            Hoy puedes gastar
          </p>
          <div className="mt-1 min-h-[2.25rem] sm:min-h-[2.75rem] md:min-h-[3.5rem]">
            {summaryPending ? (
              <div
                className="h-8 w-36 animate-pulse rounded-lg bg-slate-700/40 sm:h-10 sm:w-44 md:h-14 md:w-52"
                aria-hidden
              />
            ) : (
              <p className="text-3xl font-bold tracking-tight text-teal-400 sm:text-4xl md:text-5xl">
                {money(summary?.suggested_spend_today)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onRefresh}
            aria-label="Actualizar números del presupuesto"
            className={`mt-2 min-h-11 w-fit px-1 text-[0.65rem] font-medium text-slate-500 underline decoration-slate-600 underline-offset-4 hover:text-slate-400 sm:mt-3 sm:text-xs ${FOCUS_RING}`}
          >
            Actualizar números
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5">
          <Metric
            label="Ahorro reservado"
            value={
              summary
                ? savingsLabel(
                    summary.savings_amount,
                    summary.savings_percent,
                    summary.savings_mode,
                  )
                : "—"
            }
          />
          <Metric label="Gastos fijos" value={money(summary?.fixed_expenses_total)} />
          <Metric
            label="Variables este mes"
            value={money(summary?.variable_spent_month)}
          />
          <Metric
            label="Ingresos extra (mes)"
            value={money(summary?.extra_income_month)}
          />
          <Metric
            label="Te queda este mes"
            value={money(summary?.remaining_this_month)}
            highlight
          />
          <Metric
            label="Días que quedan"
            value={
              summary?.days_remaining_in_month != null
                ? String(summary.days_remaining_in_month)
                : "—"
            }
          />
        </div>
      </div>
      <p className="mt-5 border-t border-slate-800 pt-4 text-sm leading-relaxed text-slate-500">
        Es lo que te queda del mes repartido entre los días que faltan: ingreso y
        extras, menos ahorro, gastos fijos y lo que ya registraste en gastos del día
        a día. El ahorro (% o cantidad fija) solo se calcula sobre tu{" "}
        <strong className="text-slate-300">ingreso mensual</strong>; los extras solo
        te dan más margen.
      </p>
    </section>
  );
}
