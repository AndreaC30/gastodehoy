import type { ExpenseCategory, VariableExpense } from "@/api/types";
import { useTranslation } from "react-i18next";
import { AddVariableExpenseForm } from "@/components/dashboard/add-variable-expense-form";
import { ChevronInCircle } from "@/components/dashboard/chevron-expand";
import { getCategoryIcon } from "@/components/dashboard/category-icon";
import { money } from "@/lib/format";
import { FOCUS_RING } from "@/lib/ui-a11y";
import { TYPE_BODY, TYPE_CAPTION } from "@/lib/typography";
import { type FormEvent } from "react";

type Props = {
  categories: ExpenseCategory[];
  items: VariableExpense[];
  visibleItems: VariableExpense[];
  isLoading: boolean;
  needsToggle: boolean;
  expanded: boolean;
  hiddenCount: number;
  addPending: boolean;
  deletePending: boolean;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onToggleExpand: () => void;
  onEdit: (item: VariableExpense) => void;
  onDelete: (id: number) => void;
};

export function VariableExpensesSection({
  categories,
  items,
  visibleItems,
  isLoading,
  needsToggle,
  expanded,
  hiddenCount,
  addPending,
  deletePending,
  onSubmit,
  onToggleExpand,
  onEdit,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  return (
    <section
      data-tour="variable-expenses"
      className="rounded-2xl border border-slate-800 bg-slate-900/50 shadow-lg shadow-black/20"
    >
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">
          {t("variableExpenses.title")}
        </h2>
        <p className={`mt-1 ${TYPE_CAPTION}`}>
          {t("variableExpenses.subtitle")}
        </p>
      </div>
      <div className="p-5">
        <p className={`mb-4 ${TYPE_BODY}`}>
          {t("variableExpenses.description")}
          <strong className="text-slate-400">Gastos fijos</strong>
          <span className="hidden lg:inline">{t("variableExpenses.descriptionSuffixDesktop")}</span>
          <span className="lg:hidden">{t("variableExpenses.descriptionSuffixMobile")}</span>.
        </p>
        <AddVariableExpenseForm
          categories={categories}
          pending={addPending}
          onSubmit={onSubmit}
        />
        <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-widest text-slate-500">
          {t("variableExpenses.thisMonth")}
        </h3>
        {isLoading ? (
          <p className="text-sm text-slate-500">{t("variableExpenses.loading")}</p>
        ) : (
          <>
            <ul className="space-y-2">
              {visibleItems.map((it) => {
                const CatIcon = getCategoryIcon(it.category_icon);
                return (
                  <li
                    key={it.id}
                    className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <CatIcon
                          className="h-4 w-4 shrink-0"
                          style={{ color: it.category_color ?? "#64748b" }}
                        />
                        <p className="truncate font-semibold tabular-nums text-teal-300/90">
                          {money(it.amount)}
                        </p>
                      </div>
                      <p className="truncate text-sm text-slate-500">
                        {it.occurred_at}
                        {it.note ? ` · ${it.note}` : ""}
                        {it.category_name && !it.note
                          ? ` · ${it.category_name}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => onEdit(it)}
                        className={`min-h-11 rounded-lg border border-slate-600 px-2.5 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800 ${FOCUS_RING}`}
                        aria-label={t("variableExpenses.editLabel", { amount: `${money(it.amount)}${it.note ? `, ${it.note}` : ""}` })}
                      >
                        {t("common.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(it.id)}
                        disabled={deletePending}
                        className={`min-h-11 rounded-lg border border-rose-500/40 px-2.5 py-1.5 text-sm font-medium text-rose-400 hover:bg-rose-500/10 disabled:opacity-50 ${FOCUS_RING}`}
                        aria-label={t("variableExpenses.deleteLabel", { amount: money(it.amount) })}
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {needsToggle && (
              <button
                type="button"
                onClick={onToggleExpand}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700/90 bg-slate-950/40 px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                aria-expanded={expanded}
              >
                <ChevronInCircle expanded={expanded} />
                {expanded
                  ? t("variableExpenses.showLess")
                  : t("variableExpenses.showMore", { count: hiddenCount })}
              </button>
            )}
            {items.length === 0 && (
              <p className="mt-2 text-sm text-slate-600">{t("variableExpenses.empty")}</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
