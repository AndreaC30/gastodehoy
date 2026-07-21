import { type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { FixedExpense } from "@/api/types";
import { IconSelectDropdown } from "@/components/dashboard/icon-select-dropdown";
import { ChevronInCircle } from "@/components/dashboard/chevron-expand";
import { getCategoryIcon } from "@/components/dashboard/category-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SwipeableRow } from "@/components/ui/swipeable-row";
import { FormField } from "@/components/ui/form-field";
import { money } from "@/lib/format";
import { getDensity } from "@/lib/density-preference";
import { BTN_PRIMARY, FOCUS_RING, INPUT_CLASS } from "@/lib/ui-a11y";
import { TYPE_BODY, TYPE_CAPTION } from "@/lib/typography";
import { IoWalletOutline } from "react-icons/io5";

const inputClass = INPUT_CLASS;

type Props = {
  items: FixedExpense[];
  visibleItems: FixedExpense[];
  isLoading: boolean;
  needsToggle: boolean;
  expanded: boolean;
  hiddenCount: number;
  formIcon: string;
  pending: boolean;
  deletePending: boolean;
  onToggleExpand: () => void;
  onFormIconChange: (icon: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onEdit: (item: FixedExpense) => void;
  onDelete: (id: number) => void;
};

export function FixedExpensesSection({
  items,
  visibleItems,
  isLoading,
  needsToggle,
  expanded,
  hiddenCount,
  formIcon,
  pending,
  deletePending,
  onToggleExpand,
  onFormIconChange,
  onSubmit,
  onEdit,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const density = getDensity();
  return (
    <section
      data-tour="fixed-expenses"
      className="rounded-2xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/20"
    >
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">{t("fixedExpenses.title")}</h2>
        <p className={`mt-1 ${TYPE_CAPTION}`}>{t("fixedExpenses.subtitle")}</p>
        <p className={`mt-1.5 ${TYPE_CAPTION} text-teal-200/70`}>
          {t("monthContext.fixedRepeats")}
        </p>
      </div>
      <div className="p-5">
        <p className={`mb-4 ${TYPE_BODY}`}>
          {t("fixedExpenses.description")}
        </p>
        <form
          className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:gap-2"
          onSubmit={onSubmit}
        >
          <div className="flex w-full min-w-0 gap-2 lg:min-w-0 lg:flex-1">
            <IconSelectDropdown value={formIcon} onChange={onFormIconChange} />
            <FormField
              id="fixed-expense-name"
              label={t("fixedExpenses.concept")}
              className="min-w-0 flex-1"
              labelClassName="sr-only"
            >
              <input
                name="name"
                placeholder={t("fixedExpenses.placeholder")}
                required
                className={inputClass}
              />
            </FormField>
          </div>
          <FormField
            id="fixed-expense-amount"
            label={t("fixedExpenses.amount")}
            className="w-full lg:w-28"
            labelClassName="sr-only"
          >
            <input
              name="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              placeholder="€"
              required
              className={inputClass}
            />
          </FormField>
          <button
            type="submit"
            disabled={pending}
            className={`w-full lg:w-auto ${BTN_PRIMARY}`}
          >
            {t("fixedExpenses.add")}
          </button>
        </form>
        {isLoading ? (
          <div className="mt-4 space-y-2" aria-label={t("common.loading")}>
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        ) : (
          <>
            <ul className="mt-4 space-y-2">
              {visibleItems.length > 0 ? (
                visibleItems.map((it) => {
                const FixedIcon = getCategoryIcon(it.icon);
                return (
                  <SwipeableRow
                    key={it.id}
                    density={density}
                    actions={
                      <>
                        <button
                          type="button"
                          onClick={() => onEdit(it)}
                          className={`min-h-11 rounded-lg border border-slate-600 px-2.5 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800 ${FOCUS_RING}`}
                          aria-label={t("fixedExpenses.editLabel", { name: it.name })}
                        >
                          {t("common.edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(it.id)}
                          disabled={deletePending}
                          className={`min-h-11 rounded-lg border border-rose-500/40 px-2.5 py-1.5 text-sm font-medium text-rose-400 hover:bg-rose-500/10 disabled:opacity-50 ${FOCUS_RING}`}
                          aria-label={t("fixedExpenses.removeLabel", { name: it.name })}
                        >
                          {t("common.remove")}
                        </button>
                      </>
                    }
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FixedIcon className="h-4 w-4 shrink-0 text-sky-400/90" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-200 data-[density=compact]:text-xs" data-density={density}>{it.name}</p>
                        <p className="truncate text-sm tabular-nums text-slate-500 data-[density=compact]:text-xs" data-density={density}>{money(it.amount)}</p>
                      </div>
                    </div>
                  </SwipeableRow>
                );
              })
              ) : null}
            </ul>
            {needsToggle && (
              <button
                type="button"
                onClick={onToggleExpand}
                className={`mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-700/90 bg-slate-950 px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 ${FOCUS_RING}`}
                aria-expanded={expanded}
              >
                <ChevronInCircle expanded={expanded} />
                {expanded
                  ? t("fixedExpenses.showLess")
                  : t("fixedExpenses.showMore", { count: hiddenCount })}
              </button>
            )}
            {items.length === 0 && !isLoading && (
              <EmptyState
                icon={<IoWalletOutline className="h-12 w-12" />}
                title={t("emptyStates.noFixedExpenses")}
                description={t("emptyStates.noFixedExpensesDesc")}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}
