/** Month calendar for variable expenses — navigate months, tap a day for detail. */
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { api } from "@/api/client";
import type { PaginatedVariableExpenses, VariableExpense } from "@/api/types";
import { getCategoryIcon } from "@/components/dashboard/category-icon";
import { money } from "@/lib/format";
import {
  capitalizeFirstLetter,
  formatMonthYear,
  todayDate,
} from "@/lib/month-context";
import { FOCUS_RING, ICON_BTN, SECTION_CARD } from "@/lib/ui-a11y";
import { TYPE_CAPTION, TYPE_DISPLAY, TYPE_EYEBROW } from "@/lib/typography";

async function loadMonthExpenses(year: number, month: number) {
  return api<PaginatedVariableExpenses>(
    `/api/expenses?year=${year}&month=${month}&limit=200&offset=0`,
  );
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Monday-first pad + day numbers (null = empty cell). */
function buildMonthCells(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month - 1, 1).getDay(); // Sun=0
  const pad = (firstDow + 6) % 7; // Mon=0
  const total = daysInMonth(year, month);
  const cells: (number | null)[] = Array.from({ length: pad }, () => null);
  for (let d = 1; d <= total; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function weekdayLabels(locale: string): string[] {
  // 2024-01-01 was a Monday — walk 7 days for Mon→Sun short names.
  const labels: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(2024, 0, 1 + i);
    labels.push(
      new Intl.DateTimeFormat(locale, { weekday: "short" })
        .format(d)
        .replace(/\.$/, ""),
    );
  }
  return labels;
}

function dayKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDay(iso: string): string {
  return iso.slice(0, 10);
}

function sumAmounts(items: VariableExpense[]): number {
  return items.reduce((acc, it) => {
    const n = Number(it.amount);
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
}

function compactMoney(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n >= 1000) return `${Math.round(n / 100) / 10}k`;
  if (n >= 100) return String(Math.round(n));
  return n.toLocaleString("es-ES", {
    maximumFractionDigits: n < 10 ? 2 : 0,
    minimumFractionDigits: 0,
  });
}

export function MonthHistoryStrip() {
  const { t, i18n } = useTranslation();
  const now = todayDate();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1–12
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;
  const canGoNext = !isCurrentMonth;

  const expensesQ = useQuery({
    queryKey: ["history-expenses", year, month],
    queryFn: () => loadMonthExpenses(year, month),
  });

  const items = expensesQ.data?.items ?? [];

  const byDay = useMemo(() => {
    const map = new Map<string, VariableExpense[]>();
    for (const it of items) {
      const key = parseDay(it.occurred_at);
      const list = map.get(key);
      if (list) list.push(it);
      else map.set(key, [it]);
    }
    return map;
  }, [items]);

  const dayTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const [key, list] of byDay) {
      map.set(key, sumAmounts(list));
    }
    return map;
  }, [byDay]);

  const maxDayTotal = useMemo(() => {
    let max = 0;
    for (const v of dayTotals.values()) if (v > max) max = v;
    return max;
  }, [dayTotals]);

  const monthTotal = useMemo(() => sumAmounts(items), [items]);

  // Default day: today when viewing the current month; otherwise whole month.
  useEffect(() => {
    const today = todayDate();
    if (year === today.getFullYear() && month === today.getMonth() + 1) {
      setSelectedDay(today.getDate());
    } else {
      setSelectedDay(null);
    }
  }, [year, month]);

  const selectedKey =
    selectedDay != null ? dayKey(year, month, selectedDay) : null;
  const selectedItems =
    selectedKey != null ? (byDay.get(selectedKey) ?? []) : items;
  const selectedTotal =
    selectedKey != null ? (dayTotals.get(selectedKey) ?? 0) : monthTotal;

  const monthLabel = capitalizeFirstLetter(
    formatMonthYear(new Date(year, month - 1, 1), i18n.language),
  );
  const weekdays = useMemo(
    () => weekdayLabels(i18n.language || "es"),
    [i18n.language],
  );
  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);

  function goPrev() {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function goNext() {
    if (!canGoNext) return;
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  function intensity(total: number): number {
    if (maxDayTotal <= 0 || total <= 0) return 0;
    return Math.min(1, total / maxDayTotal);
  }

  if (expensesQ.error) {
    return (
      <p className={`${SECTION_CARD} px-4 py-3 text-sm text-[var(--color-text-muted)]`}>
        {t("monthHistory.loadError")}
      </p>
    );
  }

  return (
    <section
      className={`${SECTION_CARD} px-3 py-4 sm:px-4 md:px-5`}
      aria-label={t("monthHistory.ariaLabel")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className={TYPE_DISPLAY}>{t("monthHistory.calendarTitle")}</h2>
          <p className={`mt-1 ${TYPE_CAPTION}`}>{t("monthHistory.calendarHint")}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={TYPE_EYEBROW}>{t("monthHistory.monthTotal")}</p>
          <p className="mt-0.5 font-display text-base font-semibold tabular-nums text-[var(--color-accent)] sm:text-lg">
            {expensesQ.isPending ? "…" : money(monthTotal)}
          </p>
        </div>
      </div>

      {/* Mobile: stacked. md+: compact calendar left; list height locked to calendar + scrolls. */}
      <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,18.5rem)_minmax(0,1fr)] md:items-stretch md:gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[22rem] md:mx-0 md:max-w-none">
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={goPrev}
              className={ICON_BTN}
              aria-label={t("monthHistory.prevMonth")}
            >
              <IoChevronBack className="h-5 w-5" aria-hidden />
            </button>
            <h3 className="min-w-0 flex-1 truncate text-center font-display text-sm font-semibold tracking-tight text-[var(--color-text)] sm:text-base">
              {monthLabel}
            </h3>
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              className={`${ICON_BTN} disabled:cursor-not-allowed disabled:opacity-35`}
              aria-label={t("monthHistory.nextMonth")}
            >
              <IoChevronForward className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div
            className="mt-2 grid grid-cols-7 gap-0.5 sm:gap-1"
            role="grid"
            aria-label={monthLabel}
          >
            {weekdays.map((label) => (
              <div
                key={label}
                className="pb-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-dim)]"
                role="columnheader"
              >
                {label}
              </div>
            ))}

            {expensesQ.isPending
              ? Array.from({ length: 35 }, (_, i) => (
                  <div
                    key={i}
                    className="h-11 animate-pulse rounded-md bg-[var(--color-bg-soft)] md:h-9"
                  />
                ))
              : cells.map((day, i) => {
                  if (day == null) {
                    return (
                      <div key={`e-${i}`} className="h-11 md:h-9" aria-hidden />
                    );
                  }
                  const key = dayKey(year, month, day);
                  const total = dayTotals.get(key) ?? 0;
                  const hasSpend = total > 0;
                  const selected = selectedDay === day;
                  const isToday = isCurrentMonth && day === now.getDate();
                  const heat = intensity(total);

                  return (
                    <button
                      key={key}
                      type="button"
                      role="gridcell"
                      aria-selected={selected}
                      aria-label={`${day} ${monthLabel}${hasSpend ? `, ${money(total)}` : ""}`}
                      onClick={() =>
                        setSelectedDay((prev) => (prev === day ? null : day))
                      }
                      className={`relative flex h-11 min-h-11 flex-col items-center justify-center rounded-md border px-0.5 transition-colors md:h-9 md:min-h-9 ${FOCUS_RING} ${
                        selected
                          ? "border-[var(--color-accent-border)] bg-[var(--color-accent-dim)] ring-1 ring-[var(--color-accent-border)]"
                          : isToday
                            ? "border-[var(--color-accent-border)]/60 bg-[var(--color-bg-soft)]"
                            : hasSpend
                              ? "border-[var(--color-border-subtle)] bg-[var(--color-bg-soft)] hover:border-[var(--color-accent-border)]"
                              : "border-transparent hover:bg-[var(--color-bg-soft)]/80"
                      }`}
                      style={
                        hasSpend && !selected
                          ? {
                              backgroundColor: `color-mix(in srgb, var(--color-accent-dim) ${Math.round(28 + heat * 52)}%, var(--color-bg-soft))`,
                            }
                          : undefined
                      }
                    >
                      <span
                        className={`text-[11px] font-semibold tabular-nums leading-none sm:text-xs ${
                          selected || isToday
                            ? "text-[var(--color-accent)]"
                            : "text-[var(--color-text)]"
                        }`}
                      >
                        {day}
                      </span>
                      {hasSpend ? (
                        <span
                          className={`mt-0.5 max-w-full truncate text-[8px] font-medium tabular-nums leading-none sm:text-[9px] ${
                            selected
                              ? "text-[var(--color-accent)]"
                              : "text-[var(--color-text-muted)]"
                          }`}
                        >
                          {compactMoney(total)}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
          </div>
        </div>

        {/*
          Desktop: height:0 + min-height:100% so this column does not grow the grid
          past the calendar; the list scrolls inside that height instead.
        */}
        <div className="flex min-h-0 min-w-0 flex-col border-t border-[var(--color-border)] pt-4 md:h-0 md:min-h-full md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <div className="flex shrink-0 flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">
                {selectedDay != null
                  ? t("monthHistory.expensesForDay", {
                      day: String(selectedDay),
                      month: monthLabel,
                    })
                  : t("monthHistory.expensesFor", { month: monthLabel })}
              </h3>
              <p className="mt-0.5 text-xs text-[var(--color-text-dim)]">
                {t("monthHistory.total", { amount: money(selectedTotal) })}
                {` · ${selectedItems.length} ${t("monthHistory.entries")}`}
              </p>
            </div>
            {selectedDay != null ? (
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className={`min-h-11 text-sm font-medium text-[var(--color-accent)] ${FOCUS_RING}`}
              >
                {t("monthHistory.showFullMonth")}
              </button>
            ) : null}
          </div>

          {expensesQ.isPending ? (
            <div className="mt-3 space-y-2" aria-busy>
              <div className="h-14 animate-pulse rounded-lg bg-[var(--color-bg-soft)]" />
              <div className="h-14 animate-pulse rounded-lg bg-[var(--color-bg-soft)]" />
            </div>
          ) : selectedItems.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--color-text-dim)]">
              {selectedDay != null
                ? t("monthHistory.emptyDay")
                : t("monthHistory.emptyMonth")}
            </p>
          ) : (
            <ul className="mt-3 max-h-[min(20rem,45vh)] space-y-2 overflow-y-auto overscroll-y-contain md:max-h-none md:min-h-0 md:flex-1">
              {selectedItems.map((it) => {
                const CatIcon = getCategoryIcon(it.category_icon);
                return (
                  <li
                    key={it.id}
                    className="flex items-center gap-3 rounded-lg bg-[var(--color-bg-soft)]/80 px-3 py-2.5"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
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
      </div>
    </section>
  );
}
