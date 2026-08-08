/**
 * Histórico as a month calendar (Apple / Gmail style):
 * clean day grid, subtle markers on spend days, detail for the selected day.
 */
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
import { TYPE_CAPTION, TYPE_DISPLAY } from "@/lib/typography";

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
  const firstDow = new Date(year, month - 1, 1).getDay();
  const pad = (firstDow + 6) % 7;
  const total = daysInMonth(year, month);
  const cells: (number | null)[] = Array.from({ length: pad }, () => null);
  for (let d = 1; d <= total; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function weekdayLabels(locale: string): string[] {
  const labels: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(2024, 0, 1 + i); // Monday start
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

function formatSelectedDay(year: number, month: number, day: number, locale: string): string {
  return capitalizeFirstLetter(
    new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(year, month - 1, day)),
  );
}

const MAX_CELL_EVENTS = 2;

export function MonthHistoryStrip() {
  const { t, i18n } = useTranslation();
  const now = todayDate();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number>(() => now.getDate());

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
    for (const [key, list] of byDay) map.set(key, sumAmounts(list));
    return map;
  }, [byDay]);

  const monthTotal = useMemo(() => sumAmounts(items), [items]);

  // Reset selection when the visible month changes.
  useEffect(() => {
    const today = todayDate();
    if (year === today.getFullYear() && month === today.getMonth() + 1) {
      setSelectedDay(today.getDate());
    } else {
      setSelectedDay(1);
    }
  }, [year, month]);

  // For past months, jump to the latest day that has spend once data arrives.
  useEffect(() => {
    if (isCurrentMonth || expensesQ.isFetching || !expensesQ.isSuccess) return;
    let lastSpend: number | null = null;
    for (const key of byDay.keys()) {
      const d = Number(key.slice(8, 10));
      if (!lastSpend || d > lastSpend) lastSpend = d;
    }
    if (lastSpend != null) setSelectedDay(lastSpend);
  }, [isCurrentMonth, year, month, expensesQ.isFetching, expensesQ.isSuccess, byDay]);
  const selectedKey = dayKey(year, month, selectedDay);
  const selectedItems = byDay.get(selectedKey) ?? [];
  const selectedTotal = dayTotals.get(selectedKey) ?? 0;

  const monthLabel = capitalizeFirstLetter(
    formatMonthYear(new Date(year, month - 1, 1), i18n.language),
  );
  const selectedLabel = formatSelectedDay(
    year,
    month,
    selectedDay,
    i18n.language || "es",
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
    } else setMonth((m) => m - 1);
  }

  function goNext() {
    if (!canGoNext) return;
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else setMonth((m) => m + 1);
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
      className={`${SECTION_CARD} overflow-hidden`}
      aria-label={t("monthHistory.ariaLabel")}
    >
      {/* Toolbar — Apple-style month chrome */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={goPrev}
            className={ICON_BTN}
            aria-label={t("monthHistory.prevMonth")}
          >
            <IoChevronBack className="h-5 w-5" aria-hidden />
          </button>
          <h2 className="min-w-0 truncate px-1 font-display text-lg font-semibold tracking-tight text-[var(--color-text)] sm:text-xl">
            {monthLabel}
          </h2>
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
        <div className="flex items-center gap-3">
          {!isCurrentMonth ? (
            <button
              type="button"
              onClick={() => {
                const t0 = todayDate();
                setYear(t0.getFullYear());
                setMonth(t0.getMonth() + 1);
                setSelectedDay(t0.getDate());
              }}
              className={`min-h-11 rounded-lg px-3 text-sm font-semibold text-[var(--color-accent)] ${FOCUS_RING}`}
            >
              {t("monthHistory.today")}
            </button>
          ) : null}
          <p className="text-sm tabular-nums text-[var(--color-text-muted)]">
            <span className="text-[var(--color-text-dim)]">
              {t("monthHistory.monthTotal")}{" "}
            </span>
            <span className="font-semibold text-[var(--color-accent)]">
              {expensesQ.isPending ? "…" : money(monthTotal)}
            </span>
          </p>
        </div>
      </header>

      <div className="grid md:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)] md:items-stretch">
        {/* Month grid */}
        <div className="px-2 py-3 sm:px-4 sm:py-4">
          <div
            className="grid grid-cols-7"
            role="grid"
            aria-label={monthLabel}
          >
            {weekdays.map((label) => (
              <div
                key={label}
                role="columnheader"
                className="pb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-dim)]"
              >
                {label}
              </div>
            ))}

            {expensesQ.isPending
              ? Array.from({ length: 35 }, (_, i) => (
                  <div
                    key={i}
                    className="min-h-[3.25rem] animate-pulse border-t border-[var(--color-border)]/60 p-1 sm:min-h-[4.25rem]"
                  />
                ))
              : cells.map((day, i) => {
                  if (day == null) {
                    return (
                      <div
                        key={`e-${i}`}
                        className="min-h-[3.25rem] border-t border-[var(--color-border)]/40 sm:min-h-[4.25rem]"
                        aria-hidden
                      />
                    );
                  }

                  const key = dayKey(year, month, day);
                  const dayItems = byDay.get(key) ?? [];
                  const hasSpend = dayItems.length > 0;
                  const selected = selectedDay === day;
                  const isToday = isCurrentMonth && day === now.getDate();
                  const previews = dayItems.slice(0, MAX_CELL_EVENTS);
                  const more = dayItems.length - previews.length;

                  return (
                    <button
                      key={key}
                      type="button"
                      role="gridcell"
                      aria-selected={selected}
                      aria-current={isToday ? "date" : undefined}
                      aria-label={`${day} ${monthLabel}${hasSpend ? `, ${money(dayTotals.get(key) ?? 0)}` : ""}`}
                      onClick={() => setSelectedDay(day)}
                      className={`group flex min-h-[3.25rem] flex-col items-stretch border-t border-[var(--color-border)]/60 px-1 py-1 text-left transition-colors sm:min-h-[4.5rem] sm:px-1.5 sm:py-1.5 ${FOCUS_RING} ${
                        selected
                          ? "bg-[var(--color-accent-dim)]"
                          : "hover:bg-[var(--color-bg-soft)]/90"
                      }`}
                    >
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
                          isToday
                            ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                            : selected
                              ? "text-[var(--color-accent)]"
                              : "text-[var(--color-text)]"
                        }`}
                      >
                        {day}
                      </span>

                      {/* Mobile: dots (Gmail-lite). Desktop: event chips (Apple-lite). */}
                      {hasSpend ? (
                        <>
                          <span
                            className="mt-auto flex justify-center gap-0.5 pb-0.5 sm:hidden"
                            aria-hidden
                          >
                            {dayItems.slice(0, 3).map((it) => (
                              <span
                                key={it.id}
                                className="h-1.5 w-1.5 rounded-full"
                                style={{
                                  backgroundColor:
                                    it.category_color ?? "var(--color-accent)",
                                }}
                              />
                            ))}
                          </span>
                          <div className="mt-1 hidden min-h-0 flex-1 flex-col gap-0.5 overflow-hidden sm:flex">
                            {previews.map((it) => (
                              <span
                                key={it.id}
                                className="truncate rounded px-1 py-px text-[10px] font-medium leading-tight text-[var(--color-text)]"
                                style={{
                                  backgroundColor: `${it.category_color ?? "#22d3ee"}33`,
                                  color: it.category_color ?? "var(--color-accent)",
                                }}
                              >
                                {money(it.amount)}
                              </span>
                            ))}
                            {more > 0 ? (
                              <span className="px-1 text-[10px] text-[var(--color-text-dim)]">
                                +{more}
                              </span>
                            ) : null}
                          </div>
                        </>
                      ) : null}
                    </button>
                  );
                })}
          </div>
          <p className={`mt-3 px-1 md:hidden ${TYPE_CAPTION}`}>
            {t("monthHistory.calendarHint")}
          </p>
        </div>

        {/* Day agenda — selected day detail */}
        <aside className="flex min-h-0 flex-col border-t border-[var(--color-border)] bg-[var(--color-bg-soft)]/40 md:border-l md:border-t-0">
          <div className="shrink-0 border-b border-[var(--color-border)] px-4 py-3 sm:px-5">
            <p className={TYPE_DISPLAY}>{selectedLabel}</p>
            <p className={`mt-1 ${TYPE_CAPTION}`}>
              {t("monthHistory.total", { amount: money(selectedTotal) })}
              {` · ${selectedItems.length} ${
                selectedItems.length === 1
                  ? t("monthHistory.entryOne")
                  : t("monthHistory.entries")
              }`}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-3 sm:px-5 md:max-h-[min(28rem,55vh)]">
            {expensesQ.isPending ? (
              <div className="space-y-2" aria-busy>
                <div className="h-14 animate-pulse rounded-lg bg-[var(--color-panel)]" />
                <div className="h-14 animate-pulse rounded-lg bg-[var(--color-panel)]" />
              </div>
            ) : selectedItems.length === 0 ? (
              <p className="text-sm text-[var(--color-text-dim)]">
                {t("monthHistory.emptyDay")}
              </p>
            ) : (
              <ul className="space-y-2">
                {selectedItems.map((it) => {
                  const CatIcon = getCategoryIcon(it.category_icon);
                  return (
                    <li
                      key={it.id}
                      className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2.5"
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
                        {it.note ? (
                          <p className="truncate text-xs text-[var(--color-text-dim)]">
                            {it.note}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
