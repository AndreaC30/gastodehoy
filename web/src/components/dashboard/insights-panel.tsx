/** Financial insights panel with actionable tips. */
import { useTranslation } from "react-i18next";
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
import { TYPE_CAPTION } from "@/lib/typography";

type Props = {
  data: Insights | undefined;
  isLoading: boolean;
  error: Error | null;
};

/** Misma estructura flex + shrink-0 que rule-503020 (no falla en Android). */
const TYPE_STYLES: Record<string, string> = {
  warning: "border-[var(--color-warn-border)] bg-[var(--color-warn-dim)] text-[var(--color-warn)]",
  tip: "border-[var(--color-accent-border)] bg-[var(--color-accent-dim)] text-[var(--color-accent)]",
  success: "border-[var(--color-ok-border)] bg-[var(--color-ok-dim)] text-[var(--color-ok)]",
  info: "border-[var(--color-border-subtle)] bg-[var(--color-panel)] text-[var(--color-text)]",
};

const TYPE_ICON_COLORS: Record<string, string> = {
  warning: "text-[var(--color-warn)]",
  tip: "text-[var(--color-accent)]",
  success: "text-[var(--color-ok)]",
  info: "text-[var(--color-text-muted)]",
};

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

const PANEL_CLASS =
  "rounded-[10px] border border-[var(--color-border)] bg-[var(--color-panel)] shadow-[var(--shadow-surface)] p-3 sm:p-4 md:p-4";

export function InsightsPanel({ data, isLoading, error }: Props) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <section
        data-tour="insights"
        className={PANEL_CLASS}
        aria-busy="true"
        aria-label={t("insights.title")}
      >
        <div className="h-6 w-40 animate-pulse rounded bg-[var(--color-border)]/40" />
        <div className="mt-3 h-4 w-full animate-pulse rounded bg-[var(--color-border)]/30" />
        <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-[var(--color-border)]/30" />
      </section>
    );
  }

  if (error) {
    return (
      <section
        data-tour="insights"
        className="rounded-2xl border border-[var(--color-crit-border)] bg-[var(--color-crit-dim)] p-5 text-sm text-[var(--color-crit)]"
      >
        {t("insights.error")} {error.message}
      </section>
    );
  }

  if (!data) return null;

  return (
    <section
      data-tour="insights"
      className={PANEL_CLASS}
      aria-labelledby="insights-panel-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2
            id="insights-panel-title"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-[var(--color-text)]"
          >
            <IoBulbOutline
              className="h-5 w-5 shrink-0 text-[var(--color-accent)]"
              aria-hidden
            />
            {t("insights.title")}
          </h2>
          <p className={`mt-1 ${TYPE_CAPTION}`}>{t("insights.subtitle")}</p>
        </div>
        <div className="text-right sm:shrink-0">
          <p className={TYPE_CAPTION}>{t("insights.avgDaily")}</p>
          <p className="text-base font-semibold text-[var(--color-text)]">
            {money(data.avg_daily_spend)}
          </p>
        </div>
      </div>

      <ul className="mt-4 list-none grid grid-cols-1 gap-3 p-0 md:mt-4 md:grid-cols-2 md:gap-3">
        {data.insights.map((insight) => {
          const { Icon, colorClass } = getInsightIcon(insight);
          const cardStyle = TYPE_STYLES[insight.type] ?? TYPE_STYLES.info;
          return (
            <li
              key={`${insight.type}-${insight.title}`}
              className={`rounded-xl border px-3.5 py-3 text-sm leading-snug ${cardStyle}`}
            >
              <div className="flex items-start gap-2">
                <Icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${colorClass}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{insight.title}</p>
                  <p className="mt-0.5 text-xs text-current/90 md:text-sm">
                    {insight.message}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {Number(data.projected_monthly) > 0 && (
        <div className="mt-4 border-t border-[var(--color-border)] pt-3 md:mt-4 md:pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">{t("insights.projection")}</span>
            <span className="font-semibold text-[var(--color-text)]">
              {money(data.projected_monthly)}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
            <div
              className="h-full rounded-full bg-[var(--color-accent)]"
              style={{
                width: `${Math.min(100, (Number(data.total_spent) / Math.max(Number(data.projected_monthly), 1)) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-dim)]">
            {t("insights.projectionDetail", {
              spent: money(data.total_spent),
              projected: money(data.projected_monthly),
            })}
          </p>
        </div>
      )}
    </section>
  );
}
