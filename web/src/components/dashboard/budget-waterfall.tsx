/** Cascada «de tu sueldo a la cifra de hoy»: cada fila resta o suma hasta llegar a lo que puedes gastar hoy. */
import { useTranslation } from "react-i18next";
import type { Summary } from "@/api/types";
import { money } from "@/lib/format";
import { TYPE_EYEBROW } from "@/lib/typography";

type Props = {
  summary: Summary;
};

type Row = {
  key: string;
  label: string;
  value: string;
  /** Fila de resultado (subtotal), con más peso visual. */
  total?: boolean;
  /** Tono del valor en filas de resultado. */
  tone?: "accent" | "crit";
};

const num = (v: string | number | null | undefined) => Number(v ?? 0);
const minus = (v: number) => `− ${money(Math.abs(v))}`;
const plus = (v: number) => `+ ${money(v)}`;

export function BudgetWaterfall({ summary }: Props) {
  const { t } = useTranslation();
  const extraAvailable =
    num(summary.extra_income_month) - num(summary.extra_income_saved_month);
  const remaining = num(summary.remaining_this_month);
  const today = num(summary.suggested_spend_today);

  const rows: Row[] = [
    { key: "income", label: t("waterfall.income"), value: money(summary.monthly_income) },
    { key: "savings", label: t("waterfall.savings"), value: minus(num(summary.savings_amount)) },
    { key: "fixed", label: t("waterfall.fixed"), value: minus(num(summary.fixed_expenses_total)) },
    ...(extraAvailable > 0
      ? [{ key: "extra", label: t("waterfall.extra"), value: plus(extraAvailable) }]
      : []),
    {
      key: "available",
      label: t("waterfall.available"),
      value: money(summary.monthly_budget_after_fixed_and_savings),
      total: true,
    },
    { key: "spent", label: t("waterfall.spent"), value: minus(num(summary.variable_spent_month)) },
    {
      key: "remaining",
      label: t("waterfall.remaining"),
      value: money(remaining),
      total: true,
      tone: remaining < 0 ? "crit" : undefined,
    },
    {
      key: "days",
      label: t("waterfall.days", { count: summary.days_remaining_in_month }),
      value: `÷ ${summary.days_remaining_in_month}`,
    },
    {
      key: "today",
      label: t("waterfall.today"),
      value: money(today),
      total: true,
      tone: today < 0 ? "crit" : "accent",
    },
  ];

  return (
    <section aria-labelledby="gdh-waterfall-title">
      <h3 id="gdh-waterfall-title" className={TYPE_EYEBROW}>
        {t("waterfall.title")}
      </h3>
      <dl className="mt-2 divide-y divide-[var(--color-border)] text-sm">
        {rows.map((row) => (
          <div
            key={row.key}
            className={`flex items-baseline justify-between gap-3 py-2 ${
              row.total ? "font-semibold text-[var(--color-text)]" : "text-[var(--color-text-muted)]"
            }`}
          >
            <dt>{row.label}</dt>
            <dd
              className={`tabular-nums ${
                row.tone === "crit"
                  ? "text-[var(--color-crit)]"
                  : row.tone === "accent"
                    ? "text-[var(--color-accent)]"
                    : ""
              }`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
