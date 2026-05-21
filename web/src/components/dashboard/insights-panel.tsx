/** Financial insights panel with actionable tips. */
import type { IconType } from "react-icons";
import {
  IoAlertCircleOutline,
  IoBulbOutline,
  IoCalendarOutline,
  IoCheckmarkCircleOutline,
  IoHomeOutline,
  IoInformationCircleOutline,
  IoPieChartOutline,
  IoPricetagsOutline,
  IoTrendingDownOutline,
  IoTrendingUpOutline,
  IoWarningOutline,
} from "react-icons/io5";
import type { InsightItem, Insights } from "@/api/types";
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

const TYPE_ICON_COLORS: Record<string, string> = {
  warning: "text-amber-400",
  tip: "text-sky-400",
  success: "text-emerald-400",
  info: "text-slate-400",
};

/** API `icon` slugs from `app/services/insights.py` (no emojis on wire). */
const INSIGHT_ICON_BY_SLUG: Record<string, IconType> = {
  alert_triangle: IoWarningOutline,
  alert_circle: IoAlertCircleOutline,
  check_circle: IoCheckmarkCircleOutline,
  trending_up: IoTrendingUpOutline,
  trending_down: IoTrendingDownOutline,
  tags: IoPricetagsOutline,
  home: IoHomeOutline,
  calendar: IoCalendarOutline,
  lightbulb: IoBulbOutline,
};

function getInsightIcon(insight: InsightItem): { Icon: IconType; colorClass: string } {
  const colorClass = TYPE_ICON_COLORS[insight.type] ?? TYPE_ICON_COLORS.info;
  const fromApi = INSIGHT_ICON_BY_SLUG[insight.icon];
  if (fromApi) return { Icon: fromApi, colorClass };

  const lower = insight.title.toLowerCase();
  if (lower.includes("gasto concentrado") || lower.includes("concentrado")) {
    return { Icon: IoPieChartOutline, colorClass };
  }
  if (lower.includes("ingreso") || lower.includes("gastas casi todo")) {
    return { Icon: IoAlertCircleOutline, colorClass };
  }
  if (lower.includes("buen ritmo")) {
    return { Icon: IoTrendingDownOutline, colorClass };
  }
  if (lower.includes("sobregasto") || lower.includes("proyección")) {
    return { Icon: IoTrendingUpOutline, colorClass };
  }
  if (lower.includes("categoriza") || lower.includes("categoría") || lower.includes("categoria")) {
    return { Icon: IoPricetagsOutline, colorClass };
  }
  if (lower.includes("fijos") || lower.includes("gastos fijos")) {
    return { Icon: IoHomeOutline, colorClass };
  }
  if (lower.includes("presupuesto superado")) {
    return { Icon: IoWarningOutline, colorClass };
  }
  if (lower.includes("presupuesto diario") || lower.includes("tope diario")) {
    return { Icon: IoCalendarOutline, colorClass };
  }
  if (lower.includes("agotado") || lower.includes("presupuesto agotado")) {
    return { Icon: IoWarningOutline, colorClass };
  }
  if (lower.includes("sigue registrando")) {
    return { Icon: IoBulbOutline, colorClass };
  }

  switch (insight.type) {
    case "warning":
      return { Icon: IoWarningOutline, colorClass };
    case "tip":
      return { Icon: IoBulbOutline, colorClass };
    case "success":
      return { Icon: IoCheckmarkCircleOutline, colorClass };
    case "info":
    default:
      return { Icon: IoInformationCircleOutline, colorClass };
  }
}

export function InsightsPanel({ data, isLoading, error }: Props) {
  if (isLoading) {
    return (
      <section
        className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5"
        aria-busy="true"
        aria-label="Cargando insights"
      >
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
    <section
      className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 shadow-lg shadow-black/20 sm:p-5"
      aria-labelledby="insights-panel-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2
            id="insights-panel-title"
            className="flex items-center gap-2 text-lg font-bold tracking-tight"
          >
            <IoBulbOutline className="h-5 w-5 text-sky-400" aria-hidden />
            Insights financieros
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Análisis de tus gastos este mes
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            El gasto variable medio/día es lo que ya has registrado; «Hoy puedes
            gastar» arriba incluye ingreso, ahorro y fijos.
          </p>
        </div>
        <div className="text-right sm:shrink-0">
          <p className="text-xs text-slate-500">Gasto variable medio/día</p>
          <p className="text-sm font-semibold text-slate-200">
            {money(data.avg_daily_spend)}
          </p>
        </div>
      </div>

      <ul className="mt-4 list-none space-y-3 p-0">
        {data.insights.map((insight) => {
          const { Icon, colorClass } = getInsightIcon(insight);
          return (
            <li
              key={`${insight.type}-${insight.title}`}
              className={`rounded-xl border px-4 py-3 text-sm ${TYPE_STYLES[insight.type] ?? TYPE_STYLES.info}`}
            >
              <p className="flex items-center gap-2 font-semibold">
                <Icon className={`h-4 w-4 shrink-0 ${colorClass}`} aria-hidden />
                {insight.title}
              </p>
              <p className="mt-1 text-sm opacity-90">{insight.message}</p>
            </li>
          );
        })}
      </ul>

      {Number(data.projected_monthly) > 0 && (
        <div className="mt-5 border-t border-slate-800 pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Si sigues así (solo variables)</span>
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
            Llevas {money(data.total_spent)} en variables; si mantienes este ritmo,
            cerrarías el mes en unos {money(data.projected_monthly)} (sin contar
            ingresos ni ahorro).
          </p>
        </div>
      )}
    </section>
  );
}
