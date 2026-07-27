import { type FormEvent, useSyncExternalStore } from "react";
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
import { getDensity, subscribeDensity } from "@/lib/density-preference";
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
  const density = useSyncExternalStore(
    subscribeDensity,
    getDensity,
    () => "comfortable" as const,
  );
  return (
    <section
      data-tour="fixed-expenses"
      className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-panel)] shadow-[var(--shadow-surface)]"
    >
      <div className="border-b border-[var(--color-border)] px-5 py-4">
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">{t("fixedExpenses.title")}</h2>
        <p className={`mt-1 ${TYPE_CAPTION}`}>{t("fixedExpenses.subtitle")}</p>
        <p className={`mt-1.5 ${TYPE_CAPTION} text-[var(--color-accent)]/70`}>
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
                          className={`min-h-11 rounded-lg border border-[var(--color-border-subtle)] px-2.5 py-1.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-panel-elevated)] ${FOCUS_RING}`}
                          aria-label={t("fixedExpenses.editLabel", { name: it.name })}
                        >
                          {t("common.edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(it.id)}
                          disabled={deletePending}
                          className={`min-h-11 rounded-lg border border-[var(--color-crit-border)] px-2.5 py-1.5 text-sm font-medium text-[var(--color-crit)] hover:bg-[var(--color-crit-dim)] disabled:opacity-50 ${FOCUS_RING}`}
                          aria-label={t("fixedExpenses.removeLabel", { name: it.name })}
                        >
                          {t("common.remove")}
                        </button>
                      </>
                    }
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FixedIcon className="gdh-icon shrink-0 text-[var(--color-accent)]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--color-text)] data-[density=compact]:text-xs" data-density={density}>{it.name}</p>
                        <p className="truncate text-sm tabular-nums text-[var(--color-text-dim)] data-[density=compact]:text-xs" data-density={density}>{money(it.amount)}</p>
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
                className={`mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-soft)] px-3 py-2.5 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-panel)] hover:text-[var(--color-text)] ${FOCUS_RING}`}
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
