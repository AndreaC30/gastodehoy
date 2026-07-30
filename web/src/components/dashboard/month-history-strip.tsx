/** Compact strip: variable spend for the last N months + list for the selected month. */
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/api/client";
import type { MonthHistoryItem, MonthHistoryRead, PaginatedVariableExpenses } from "@/api/types";
import { getCategoryIcon } from "@/components/dashboard/category-icon";
import { money } from "@/lib/format";
import { FOCUS_RING } from "@/lib/ui-a11y";
import { TYPE_CAPTION, TYPE_EYEBROW } from "@/lib/typography";

const MONTH_OPTIONS = [3, 6, 12] as const;
type MonthCount = (typeof MONTH_OPTIONS)[number];

type MonthKey = `${number}-${number}`;

function monthKey(year: number, month: number): MonthKey {
  return `${year}-${month}`;
}

async function loadMonthHistory(months: MonthCount) {
  return api<MonthHistoryRead>(`/api/summary/history?months=${months}`);
}

async function loadMonthExpenses(year: number, month: number) {
  return api<PaginatedVariableExpenses>(
    `/api/expenses?year=${year}&month=${month}&limit=200&offset=0`,
  );
}

function historyTitle(t: (key: string, opts?: Record<string, string>) => string, months: MonthCount): string {
  return t("monthHistory.lastMonths", { months: String(months) });
}

function gridClass(months: MonthCount): string {
  if (months === 3) return "grid grid-cols-3 gap-2 sm:gap-3";
  if (months === 6) return "grid grid-cols-3 gap-2 sm:gap-3";
  return "flex gap-2 overflow-x-auto pb-1 sm:gap-3 [-webkit-overflow-scrolling:touch]";
}

function cardClass(months: MonthCount, selected: boolean, isCurrentMonth: boolean): string {
  const base =
    "rounded-2xl border px-3 py-3 text-center sm:px-3 shrink-0 min-w-[5rem] sm:min-w-0 min-h-[4.75rem] transition-colors";
  let tone: string;
  if (selected) {
    tone = "border-[var(--color-accent-border)] bg-[var(--color-accent-dim)] ring-1 ring-[var(--color-accent-border)]";
  } else if (isCurrentMonth) {
    tone = "border-[var(--color-border-subtle)] bg-[var(--color-bg-soft)]";
  } else {
    tone = "border-[var(--color-border)] bg-[var(--color-bg-soft)] hover:border-[var(--color-border-subtle)]";
  }
  if (months === 12) return `${base} w-[5rem] sm:w-auto sm:shrink ${tone}`;
  return `${base} ${tone}`;
}

export function MonthHistoryStrip() {
  const { t } = useTranslation();
  const [months, setMonths] = useState<MonthCount>(3);
  const [selected, setSelected] = useState<MonthKey | null>(null);

  const { data, isPending, error } = useQuery({
    queryKey: ["history", months],
    queryFn: () => loadMonthHistory(months),
  });

  const rows = data?.months ?? [];

  // Default selection: current (last) month in the strip.
  useEffect(() => {
    if (rows.length === 0) return;
    const last = rows[rows.length - 1];
    const key = monthKey(last.year, last.month);
    setSelected((prev) => {
      if (prev && rows.some((r) => monthKey(r.year, r.month) === prev)) return prev;
      return key;
    });
  }, [rows]);

  const selectedRow: MonthHistoryItem | undefined = rows.find(
    (r) => monthKey(r.year, r.month) === selected,
  );

  const expensesQ = useQuery({
    queryKey: ["history-expenses", selectedRow?.year, selectedRow?.month],
    queryFn: () => loadMonthExpenses(selectedRow!.year, selectedRow!.month),
    enabled: selectedRow != null,
  });

  if (error) {
    return (
      <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
        {t("monthHistory.loadError", { defaultValue: "No se pudo cargar el historial mensual." })}
      </p>
    );
  }

  if (isPending) {
    return (
      <div className={gridClass(months)} aria-label={t("common.loading")}>
        {Array.from({ length: months }, (_, i) => (
          <div
            key={i}
            className="h-[4.5rem] animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)]"
          />
        ))}
      </div>
    );
  }

  if (rows.length === 0) return null;

  const expenseItems = expensesQ.data?.items ?? [];

  return (
    <section
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-4 shadow-[var(--shadow-surface)] sm:px-4"
      aria-label={t("monthHistory.ariaLabel")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold tracking-tight text-[var(--color-text)] sm:text-xl">
            {historyTitle(t, months)}
          </h2>
          <p className={`mt-1 ${TYPE_CAPTION}`}>
            {t("monthHistory.hint", {
              defaultValue: "Toca un mes para ver sus gastos variables",
            })}
          </p>
        </div>
        <div
          className="inline-flex rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-panel)] p-0.5"
          role="group"
          aria-label={t("monthHistory.rangeLabel", { defaultValue: "Meses a mostrar" })}
        >
          {MONTH_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMonths(n)}
              aria-pressed={months === n}
              className={`min-h-11 min-w-11 rounded-md px-2.5 py-1 text-sm font-semibold transition-colors ${FOCUS_RING} ${
                months === n
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className={`mt-4 ${gridClass(months)}`} role="listbox" aria-label={t("monthHistory.ariaLabel")}>
        {rows.map((row, index) => {
          const key = monthKey(row.year, row.month);
          const isCurrentMonth = index === rows.length - 1;
          const isSelected = selected === key;
          return (
            <button
              key={key}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => setSelected(key)}
              className={`${cardClass(months, isSelected, isCurrentMonth)} ${FOCUS_RING}`}
            >
              <p className={`${TYPE_EYEBROW} text-center`}>{row.month_label}</p>
              <p
                className={`mt-1 truncate text-base font-bold tabular-nums sm:text-lg ${
                  isSelected ? "text-[var(--color-accent)]" : "text-[var(--color-text)]"
                }`}
              >
                {money(row.variable_spent_month)}
              </p>
            </button>
          );
        })}
      </div>

      {selectedRow && (
        <div className="mt-5 border-t border-[var(--color-border)] pt-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">
            {t("monthHistory.expensesFor", {
              defaultValue: "Gastos variables · {{month}}",
              month: selectedRow.month_label,
            })}
          </h3>
          <p className="mt-0.5 text-xs text-[var(--color-text-dim)]">
            {t("monthHistory.total", {
              defaultValue: "Total {{amount}}",
              amount: money(selectedRow.variable_spent_month),
            })}
            {expensesQ.data?.meta.total != null
              ? ` · ${expensesQ.data.meta.total} ${t("monthHistory.entries", { defaultValue: "movimientos" })}`
              : ""}
          </p>

          {expensesQ.isPending ? (
            <div className="mt-3 space-y-2" aria-busy>
              <div className="h-14 animate-pulse rounded-lg bg-[var(--color-bg-soft)]" />
              <div className="h-14 animate-pulse rounded-lg bg-[var(--color-bg-soft)]" />
            </div>
          ) : expensesQ.error ? (
            <p className="mt-3 text-sm text-[var(--color-crit)]" role="alert">
              {(expensesQ.error as Error).message}
            </p>
          ) : expenseItems.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--color-text-dim)]">
              {t("monthHistory.emptyMonth", {
                defaultValue: "No hay gastos variables en este mes.",
              })}
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {expenseItems.map((it) => {
                const CatIcon = getCategoryIcon(it.category_icon);
                return (
                  <li
                    key={it.id}
                    className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2.5"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)]"
                      style={{
                        backgroundColor: `${it.category_color ?? "#223040"}22`,
                        color: it.category_color ?? "var(--color-accent)",
                      }}
                      aria-hidden
                    >
                      <CatIcon className="gdh-icon-lg" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold tabular-nums text-[var(--color-text)]">
                        {money(it.amount)}
                        {it.category_name ? (
                          <span className="font-medium text-[var(--color-text-muted)]">
                            {" "}
                            · {it.category_name}
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-[var(--color-text-dim)]">
                        {it.occurred_at}
                        {it.note ? ` · ${it.note}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
