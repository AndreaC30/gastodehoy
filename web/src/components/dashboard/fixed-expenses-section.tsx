import { type FormEvent } from "react";
import type { FixedExpense } from "@/api/types";
import { IconSelectDropdown } from "@/components/dashboard/icon-select-dropdown";
import { ChevronInCircle } from "@/components/dashboard/chevron-expand";
import { getCategoryIcon } from "@/components/dashboard/category-icon";
import { FormField } from "@/components/ui/form-field";
import { money } from "@/lib/format";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/40";

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
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/50 shadow-lg shadow-black/20">
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 className="text-lg font-bold tracking-tight">Gastos fijos</h2>
        <p className="mt-1 text-sm text-slate-500">Lo que pagas igual cada mes</p>
      </div>
      <div className="p-5">
        <p className="mb-4 text-sm text-slate-500">
          Vivienda, seguros, suscripciones… suman aquí.
        </p>
        <form
          className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2"
          onSubmit={onSubmit}
        >
          <div className="flex w-full min-w-0 gap-2 sm:min-w-[140px] sm:flex-1">
            <IconSelectDropdown value={formIcon} onChange={onFormIconChange} />
            <FormField
              id="fixed-expense-name"
              label="Concepto"
              className="min-w-0 flex-1"
              labelClassName="sr-only"
            >
              <input
                name="name"
                placeholder="Ej. Alquiler"
                required
                className={inputClass}
              />
            </FormField>
          </div>
          <FormField
            id="fixed-expense-amount"
            label="Importe (€)"
            className="w-full sm:w-24"
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
            className="w-full rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-60 sm:w-auto"
          >
            Añadir
          </button>
        </form>
        {isLoading ? (
          <p className="mt-4 text-sm text-slate-500">Cargando gastos fijos…</p>
        ) : (
          <>
            <ul className="mt-4 space-y-2">
              {visibleItems.map((it) => {
                const FixedIcon = getCategoryIcon(it.icon);
                return (
                  <li
                    key={it.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FixedIcon className="h-4 w-4 shrink-0 text-sky-400/90" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-200">{it.name}</p>
                        <p className="text-sm text-slate-500">{money(it.amount)}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEdit(it)}
                        className="rounded-lg border border-slate-600 px-2.5 py-1 text-sm font-medium text-slate-300 hover:bg-slate-800"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(it.id)}
                        disabled={deletePending}
                        className="rounded-lg border border-rose-500/40 px-2.5 py-1 text-sm font-medium text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"
                      >
                        Quitar
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
                  ? "Mostrar menos"
                  : `Ver ${hiddenCount} gasto${hiddenCount === 1 ? "" : "s"} fijo${hiddenCount === 1 ? "" : "s"} más`}
              </button>
            )}
            {items.length === 0 && !isLoading && (
              <p className="mt-4 text-sm text-slate-600">Ningún gasto fijo aún.</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
