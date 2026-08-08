import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/api/client";
import type { FixedExpense } from "@/api/types";
import { DEFAULT_FIXED_EXPENSE_ICON } from "@/components/dashboard/category-icon";
import { IconSelectDropdown } from "@/components/dashboard/icon-select-dropdown";
import { AppSheet } from "@/components/ui/app-sheet";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT_CLASS } from "@/lib/ui-a11y";

type Props = {
  expense: FixedExpense;
  onClose: () => void;
  onSaved: () => void;
};

export function EditFixedExpenseModal({ expense, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(expense.name);
  const [amount, setAmount] = useState(String(expense.amount));
  const [icon, setIcon] = useState(expense.icon ?? DEFAULT_FIXED_EXPENSE_ICON);
  const [error, setError] = useState<string | null>(null);

  const saveMut = useMutation({
    mutationFn: (body: { name: string; amount: string; icon: string }) =>
      api<FixedExpense>(`/api/fixed-expenses/${expense.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("fixedExpenses.nameError"));
      return;
    }
    saveMut.mutate({
      name: trimmed,
      amount: amount || "0",
      icon,
    });
  }

  return (
    <AppSheet
      open
      onClose={onClose}
      title={`${t("common.edit", { defaultValue: "Editar" })} ${t("fixedExpenses.title")}`}
      zClass="z-50"
      labelledById="edit-fixed-title"
    >
      {error && (
        <p
          className="mb-4 rounded-lg border border-[var(--color-crit-border)] bg-[var(--color-crit-dim)] px-3 py-2 text-sm text-[var(--color-crit)]"
          role="alert"
        >
          {error}
        </p>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="edit-fixed-name" className="mb-1.5 block text-xs text-[var(--color-text-muted)]">
            {t("fixedExpenses.concept")}
          </label>
          <div className="flex min-w-0 gap-2">
            <IconSelectDropdown value={icon} onChange={setIcon} />
            <input
              id="edit-fixed-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={`min-w-0 flex-1 ${INPUT_CLASS}`}
            />
          </div>
        </div>
        <div>
          <label htmlFor="edit-fixed-amount" className="mb-1.5 block text-xs text-[var(--color-text-muted)]">
            {t("fixedExpenses.amount")}
          </label>
          <input
            id="edit-fixed-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className={INPUT_CLASS}
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className={`flex-1 ${BTN_SECONDARY}`}>
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={saveMut.isPending}
            className={`flex-1 ${BTN_PRIMARY}`}
          >
            {saveMut.isPending
              ? t("common.saving")
              : t("common.save")}
          </button>
        </div>
      </form>
    </AppSheet>
  );
}
