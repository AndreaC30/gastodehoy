/** Compact strip: variable spend for the last three calendar months. */
import type { MonthHistoryRead } from "@/api/types";
import { money } from "@/lib/format";

type Props = {
  data: MonthHistoryRead | undefined;
  isLoading: boolean;
  error: Error | null;
};

export function MonthHistoryStrip({ data, isLoading, error }: Props) {
  if (error) {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm text-slate-500">
        No se pudo cargar el historial mensual.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div
        className="grid grid-cols-3 gap-2 sm:gap-3"
        aria-label="Cargando historial mensual"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[4.5rem] animate-pulse rounded-xl border border-slate-800 bg-slate-900/50"
          />
        ))}
      </div>
    );
  }

  const months = data?.months?.slice(0, 3) ?? [];
  if (months.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-4 shadow-lg shadow-black/20"
      aria-label="Gasto variable últimos meses"
    >
      <h2 className="text-sm font-semibold tracking-tight text-slate-300">
        Últimos 3 meses
      </h2>
      <p className="mt-0.5 text-xs text-slate-500">Gasto variable por mes</p>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
        {months.map((row, index) => {
          const isCurrentMonth = index === months.length - 1;
          return (
          <div
            key={`${row.year}-${row.month}`}
            className={`rounded-xl border px-2.5 py-2.5 text-center sm:px-3 ${
              isCurrentMonth
                ? "border-teal-500/35 bg-teal-500/10"
                : "border-slate-800 bg-slate-900/90"
            }`}
          >
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
              {row.month_label}
            </p>
            <p
              className={`mt-1 text-base font-bold tabular-nums sm:text-lg ${
                isCurrentMonth ? "text-teal-400" : "text-slate-200"
              }`}
            >
              {money(row.variable_spent_month)}
            </p>
          </div>
          );
        })}
      </div>
    </section>
  );
}
