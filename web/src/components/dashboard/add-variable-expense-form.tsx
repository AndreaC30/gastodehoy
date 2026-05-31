import { useTranslation } from "react-i18next";
import { type FormEvent } from "react";
import type { ExpenseCategory } from "@/api/types";
import { FormField } from "@/components/ui/form-field";
import { BTN_PRIMARY, INPUT_CLASS } from "@/lib/ui-a11y";

const inputClass = INPUT_CLASS;

type Props = {
  categories: ExpenseCategory[];
  pending: boolean;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
};

export function AddVariableExpenseForm({ categories, pending, onSubmit }: Props) {
  const { t } = useTranslation();
  return (
    <form
      className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:gap-2"
      onSubmit={onSubmit}
    >
      <FormField
        id="var-expense-amount"
        label={t("addVariableExpense.amount")}
        className="w-full min-w-0 lg:flex-1"
        labelClassName="sr-only"
      >
        <input
          name="amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          placeholder={t("addVariableExpense.amountPlaceholder")}
          required
          className={inputClass}
        />
      </FormField>
      <FormField
        id="var-expense-category"
        label={t("addVariableExpense.category")}
        className="w-full min-w-0 lg:flex-1"
        labelClassName="sr-only"
      >
        <select name="category_id" defaultValue="" className={inputClass}>
          <option value="">{t("addVariableExpense.uncategorized")}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField
        id="var-expense-note"
        label={t("addVariableExpense.note")}
        className="w-full min-w-0 lg:flex-1"
        labelClassName="sr-only"
      >
        <input
          name="note"
          type="text"
          placeholder={t("addVariableExpense.notePlaceholder")}
          className={inputClass}
        />
      </FormField>
      <button
        type="submit"
        disabled={pending}
        className={`w-full lg:w-auto lg:self-end ${BTN_PRIMARY}`}
      >
        {t("addVariableExpense.register")}
      </button>
    </form>
  );
}
