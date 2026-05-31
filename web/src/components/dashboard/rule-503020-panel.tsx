/** 50/30/20 rule: needs / wants / savings vs monthly income. */
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { IoPieChartOutline, IoCheckmarkCircle, IoWarningOutline, IoInformationCircleOutline } from "react-icons/io5";
import { api } from "@/api/client";
import type { Rule503020 } from "@/api/types";
import { money } from "@/lib/format";
import { TYPE_BODY, TYPE_CAPTION } from "@/lib/typography";

async function loadRule503020(lang: string) {
  return api<Rule503020>(`/api/rule-503020?lang=${lang}`);
}

function pctBar(
  label: string,
  actual: string | number,
  target: string | number,
  amount: string | number,
  tone: string,
  ofText: string,
) {
  const actualNum = Number(actual);
  const targetNum = Number(target);
  const width = Math.min(100, Math.max(0, actualNum));
  const over = actualNum > targetNum + 5;
  return (
    <div key={label}>
      <div className="flex items-baseline justify-between gap-2 text-sm sm:text-base">
        <span className="font-medium text-slate-300">{label}</span>
        <span className="tabular-nums text-slate-200">
          {actual}% <span className="text-slate-600">{ofText} {target}%</span>
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${over ? "bg-amber-500/80" : tone}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <p className={`mt-0.5 ${TYPE_CAPTION}`}>{money(amount)}</p>
    </div>
  );
}

export function Rule503020Panel() {
  const { t, i18n } = useTranslation();
  const { data, isPending, error } = useQuery({
    queryKey: ["rule-503020", i18n.language],
    queryFn: () => loadRule503020(i18n.language),
  });

  if (error) {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-500">
        {t("rule503020.error")}
      </p>
    );
  }

  if (isPending) {
    return (
      <div
        className="h-40 animate-pulse rounded-2xl border border-slate-800 bg-slate-900"
        aria-label={t("rule503020.title")}
      />
    );
  }

  if (!data) return null;

  return (
    <section
      className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4 shadow-lg shadow-black/20"
      aria-label={t("rule503020.title")}
    >
      <div className="flex items-start gap-2">
        <IoPieChartOutline
          className="mt-0.5 h-5 w-5 shrink-0 text-teal-400"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold tracking-tight text-slate-200 sm:text-lg">
            {t("rule503020.title")}
          </h2>
          <p className={`mt-0.5 ${TYPE_CAPTION}`}>
            {t("rule503020.subtitle", { income: money(data.income) })}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {t("rule503020.explanation")}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {pctBar(
          t("rule503020.needs"),
          data.needs_pct,
          data.target_needs_pct,
          data.needs_spent,
          "bg-teal-500/70",
          t("rule503020.of"),
        )}
        {pctBar(
          t("rule503020.wants"),
          data.wants_pct,
          data.target_wants_pct,
          data.wants_spent,
          "bg-sky-500/70",
          t("rule503020.of"),
        )}
        {pctBar(
          t("rule503020.savings"),
          data.savings_pct,
          data.target_savings_pct,
          data.savings_amount,
          "bg-emerald-500/70",
          t("rule503020.of"),
        )}
      </div>

      {Number(data.other_spent) > 0 && (
        <p className={`mt-3 ${TYPE_CAPTION}`}>
          {t("rule503020.uncategorized", { amount: money(data.other_spent) })}
        </p>
      )}

      {data.insights.length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-slate-800 pt-3">
          {data.insights.map((insight, i) => {
            const Icon = insight.type === "ok"
              ? IoCheckmarkCircle
              : insight.type === "warn"
                ? IoWarningOutline
                : IoInformationCircleOutline;
            const iconColor = insight.type === "ok"
              ? "text-emerald-400"
              : insight.type === "warn"
                ? "text-amber-400"
                : "text-slate-400";
            return (
              <li
                key={i}
                className={`flex items-start gap-2 rounded-lg border border-slate-800/80 bg-slate-950 px-3 py-2.5 ${TYPE_BODY}`}
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} aria-hidden />
                <span>{insight.text}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
