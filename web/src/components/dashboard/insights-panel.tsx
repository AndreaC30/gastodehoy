/** Financial insights panel with actionable tips. */
import type { Insights } from "@/api/types";
import { money } from "@/lib/format";

type Props = {
  data: Insights | undefined;
  isLoading: boolean;
  error: Error | null;
};

const TYPE_STYLES: Record<string, string> = {
  warning: "border-amber-500/40 bg-amber-950/30 text-amber-200",
  tip: "border-sky-500/40 bg-sky-950/30 text-sky-200",
  success: "border-emerald-500/40 bg-emerald-950/30 text-emerald-200",
  info: "border-slate-600/40 bg-slate-800/40 text-slate-300",
};

export function InsightsPanel({ data, isLoading, error }: Props) {
  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-700/40" />
        <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-700/30" />
        <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-slate-700/30" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-5 text-sm text-rose-300">
        No se pudieron cargar los insights. {error.message}
      </section>
    );
  }

  if (!data) return null;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            💡 Insights financieros
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Análisis de tus gastos este mes
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Promedio diario</p>
          <p className="text-sm font-semibold text-slate-200">
            {money(data.avg_daily_spend)}
          </p>
        </div>
      </div>

      {/* Insight cards */}
      <div className="mt-4 space-y-3">
        {data.insights.map((insight, i) => (
          <div
            key={i}
            className={`rounded-xl border px-4 py-3 text-sm ${TYPE_STYLES[insight.type] ?? TYPE_STYLES.info}`}
          >
            <p className="font-semibold">
              {insight.icon} {insight.title}
            </p>
            <p className="mt-1 text-sm opacity-90">{insight.message}</p>
          </div>
        ))}
      </div>

      {/* Projection bar */}
      {Number(data.projected_monthly) > 0 && (
        <div className="mt-5 border-t border-slate-800 pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Proyección mensual</span>
            <span className="font-semibold text-slate-200">
              {money(data.projected_monthly)}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-teal-500 transition-all duration-700"
              style={{
                width: `${Math.min(100, (Number(data.total_spent) / Math.max(Number(data.projected_monthly), 1)) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Llevas {money(data.total_spent)} de {money(data.projected_monthly)} proyectados
          </p>
        </div>
      )}
    </section>
  );
}
