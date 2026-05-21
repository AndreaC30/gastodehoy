import { type FormEvent } from "react";
import type { ExpenseCategory } from "@/api/types";
import { FormField } from "@/components/ui/form-field";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/40";

type Props = {
  categories: ExpenseCategory[];
  pending: boolean;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
};

export function AddVariableExpenseForm({ categories, pending, onSubmit }: Props) {
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2"
      onSubmit={onSubmit}
    >
      <FormField
        id="var-expense-amount"
        label="Cantidad (€)"
        className="w-full sm:min-w-[100px] sm:flex-1"
        labelClassName="sr-only"
      >
        <input
          name="amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          placeholder="Cantidad (€)"
          required
          className={inputClass}
        />
      </FormField>
      <FormField
        id="var-expense-category"
        label="Categoría"
        className="w-full sm:min-w-[120px] sm:flex-1"
        labelClassName="sr-only"
      >
        <select name="category_id" defaultValue="" className={inputClass}>
          <option value="">Sin categoría</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField
        id="var-expense-note"
        label="Nota (opcional)"
        className="w-full sm:min-w-[120px] sm:flex-1"
        labelClassName="sr-only"
      >
        <input
          name="note"
          type="text"
          placeholder="Nota (opcional)"
          className={inputClass}
        />
      </FormField>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-60 sm:w-auto sm:self-end"
      >
        Registrar
      </button>
    </form>
  );
}
