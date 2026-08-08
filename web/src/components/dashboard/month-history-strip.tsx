/**
 * Histórico: navigate months and browse variable expenses grouped by day.
 * Day-first timeline (more intuitive than a dense calendar grid).
 */
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import { ICON_BTN, SECTION_CARD } from "@/lib/ui-a11y";
import { TYPE_CAPTION, TYPE_DISPLAY, TYPE_EYEBROW } from "@/lib/typography";

async function loadMonthExpenses(year: number, month: number) {
  return api<PaginatedVariableExpenses>(
    `/api/expenses?year=${year}&month=${month}&limit=200&offset=0`,
  );
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

function formatDayHeading(isoDay: string, locale: string): string {
  const [y, m, d] = isoDay.split("-").map(Number);
  if (!y || !m || !d) return isoDay;
  const date = new Date(y, m - 1, d);
  return capitalizeFirstLetter(
    new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "short",
    }).format(date),
  );
}

type DayGroup = {
  day: string;
  total: number;
  items: VariableExpense[];
};

export function MonthHistoryStrip() {
  const { t, i18n } = useTranslation();
  const now = todayDate();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;
  const canGoNext = !isCurrentMonth;

  const expensesQ = useQuery({
    queryKey: ["history-expenses", year, month],
    queryFn: () => loadMonthExpenses(year, month),
  });

  const items = expensesQ.data?.items ?? [];
  const monthTotal = useMemo(() => sumAmounts(items), [items]);

  const dayGroups = useMemo(() => {
    const map = new Map<string, VariableExpense[]>();
    for (const it of items) {
      const key = parseDay(it.occurred_at);
      const list = map.get(key);
      if (list) list.push(it);
      else map.set(key, [it]);
    }
    const groups: DayGroup[] = [...map.entries()].map(([day, dayItems]) => ({
      day,
      total: sumAmounts(dayItems),
      items: dayItems,
    }));
    // Newest days first
    groups.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
    return groups;
  }, [items]);

  const monthLabel = capitalizeFirstLetter(
    formatMonthYear(new Date(year, month - 1, 1), i18n.language),
  );

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

  if (expensesQ.error) {
    return (
      <p className={`${SECTION_CARD} px-4 py-3 text-sm text-[var(--color-text-muted)]`}>
        {t("monthHistory.loadError")}
      </p>
    );
  }

  return (
    <section
      className={`${SECTION_CARD} px-3 py-4 sm:px-5`}
      aria-label={t("monthHistory.ariaLabel")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className={TYPE_DISPLAY}>{t("monthHistory.timelineTitle")}</h2>
          <p className={`mt-1 ${TYPE_CAPTION}`}>{t("monthHistory.timelineHint")}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={TYPE_EYEBROW}>{t("monthHistory.monthTotal")}</p>
          <p className="mt-0.5 font-display text-base font-semibold tabular-nums text-[var(--color-accent)] sm:text-lg">
            {expensesQ.isPending ? "…" : money(monthTotal)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)]/80 px-1 py-1">
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

      {expensesQ.isPending ? (
        <div className="mt-5 space-y-3" aria-busy aria-label={t("common.loading")}>
          <div className="h-16 animate-pulse rounded-lg bg-[var(--color-bg-soft)]" />
          <div className="h-16 animate-pulse rounded-lg bg-[var(--color-bg-soft)]" />
          <div className="h-16 animate-pulse rounded-lg bg-[var(--color-bg-soft)]" />
        </div>
      ) : dayGroups.length === 0 ? (
        <p className="mt-5 text-sm text-[var(--color-text-dim)]">
          {t("monthHistory.emptyMonth")}
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          <p className={`text-xs text-[var(--color-text-dim)]`}>
            {t("monthHistory.daysWithSpend", {
              count: String(dayGroups.length),
              entries: String(items.length),
            })}
          </p>

          <ul className="space-y-5">
            {dayGroups.map((group) => (
              <li key={group.day}>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--color-border)] pb-2">
                  <h3 className="font-display text-sm font-semibold text-[var(--color-text)]">
                    {formatDayHeading(group.day, i18n.language || "es")}
                  </h3>
                  <p className="text-sm font-semibold tabular-nums text-[var(--color-accent)]">
                    {money(group.total)}
                    <span className="ml-1.5 text-xs font-medium text-[var(--color-text-dim)]">
                      · {group.items.length}{" "}
                      {group.items.length === 1
                        ? t("monthHistory.entryOne")
                        : t("monthHistory.entries")}
                    </span>
                  </p>
                </div>

                <ul className="space-y-2">
                  {group.items.map((it) => {
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
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
