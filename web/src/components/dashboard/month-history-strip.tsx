/** Compact strip: variable spend for the last N calendar months (3, 6, or 12). */
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/api/client";
import type { MonthHistoryRead } from "@/api/types";
import { money } from "@/lib/format";

const MONTH_OPTIONS = [3, 6, 12] as const;
type MonthCount = (typeof MONTH_OPTIONS)[number];

async function loadMonthHistory(months: MonthCount) {
  return api<MonthHistoryRead>(`/api/summary/history?months=${months}`);
}

function historyTitle(months: MonthCount): string {
  return `Últimos ${months} meses`;
}

function gridClass(months: MonthCount): string {
  if (months === 3) return "grid grid-cols-3 gap-2 sm:gap-3";
  if (months === 6) return "grid grid-cols-6 gap-2 sm:grid-cols-3 sm:gap-3";
  return "flex gap-2 overflow-x-auto pb-1 sm:gap-3 [-webkit-overflow-scrolling:touch]";
}

function cardClass(months: MonthCount, isCurrentMonth: boolean): string {
  const base =
    "rounded-xl border px-2.5 py-2.5 text-center sm:px-3 shrink-0 min-w-[4.5rem] sm:min-w-0";
  const tone = isCurrentMonth
    ? "border-teal-500/35 bg-teal-500/10"
    : "border-slate-800 bg-slate-900/90";
  if (months === 12) return `${base} w-[4.75rem] sm:w-auto sm:shrink ${tone}`;
  return `${base} ${tone}`;
}

export function MonthHistoryStrip() {
  const [months, setMonths] = useState<MonthCount>(3);
  const { data, isPending, error } = useQuery({
    queryKey: ["history", months],
    queryFn: () => loadMonthHistory(months),
  });

  if (error) {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm text-slate-500">
        No se pudo cargar el historial mensual.
      </p>
    );
  }

  if (isPending) {
    return (
      <div
        className={gridClass(months)}
        aria-label="Cargando historial mensual"
      >
        {Array.from({ length: months }, (_, i) => (
          <div
            key={i}
            className="h-[4.5rem] animate-pulse rounded-xl border border-slate-800 bg-slate-900/50"
          />
        ))}
      </div>
    );
  }

  const rows = data?.months ?? [];
  if (rows.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-4 shadow-lg shadow-black/20"
      aria-label="Gasto variable últimos meses"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-300">
            {historyTitle(months)}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">Gasto variable por mes</p>
        </div>
        <div
          className="inline-flex rounded-lg border border-slate-700 bg-slate-900/80 p-0.5"
          role="group"
          aria-label="Meses a mostrar"
        >
          {MONTH_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMonths(n)}
              aria-pressed={months === n}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                months === n
                  ? "bg-teal-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className={`mt-3 ${gridClass(months)}`}>
        {rows.map((row, index) => {
          const isCurrentMonth = index === rows.length - 1;
          return (
            <div
              key={`${row.year}-${row.month}`}
              className={cardClass(months, isCurrentMonth)}
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
