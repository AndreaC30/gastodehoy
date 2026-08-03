import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/api/client";
import type { ExpenseCategory, VariableExpense } from "@/api/types";
import { AppSheet } from "@/components/ui/app-sheet";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT_CLASS } from "@/lib/ui-a11y";

type Props = {
  expense: VariableExpense;
  categories: ExpenseCategory[];
  onClose: () => void;
  onSaved: () => void;
};

export function EditVariableExpenseModal({
  expense,
  categories,
  onClose,
  onSaved,
}: Props) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(String(expense.amount));
  const [occurredAt, setOccurredAt] = useState(expense.occurred_at);
  const [categoryId, setCategoryId] = useState(
    expense.category_id != null ? String(expense.category_id) : "",
  );
  const [note, setNote] = useState(expense.note ?? "");
  const [error, setError] = useState<string | null>(null);

  const saveMut = useMutation({
    mutationFn: (body: {
      amount: string;
      occurred_at: string;
      note: string | null;
      category_id: number | null;
    }) =>
      api<VariableExpense>(`/api/expenses/${expense.id}`, {
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
    const trimmedNote = note.trim();
    saveMut.mutate({
      amount,
      occurred_at: occurredAt,
      note: trimmedNote || null,
      category_id: categoryId ? Number(categoryId) : null,
    });
  }

  return (
    <AppSheet
      open
      onClose={onClose}
      title={t("editVariableExpense.title", { defaultValue: "Editar gasto" })}
      zClass="z-50"
      labelledById="edit-variable-title"
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
          <label htmlFor="edit-var-amount" className="mb-1.5 block text-xs text-[var(--color-text-muted)]">
            {t("addVariableExpense.amount", { defaultValue: "Cantidad (€)" })}
          </label>
          <input
            id="edit-var-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="edit-var-date" className="mb-1.5 block text-xs text-[var(--color-text-muted)]">
            {t("editVariableExpense.date", { defaultValue: "Fecha" })}
          </label>
          <input
            id="edit-var-date"
            type="date"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            required
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="edit-var-category" className="mb-1.5 block text-xs text-[var(--color-text-muted)]">
            {t("editVariableExpense.category")}
          </label>
          <select
            id="edit-var-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">{t("editVariableExpense.uncategorized")}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="edit-var-note" className="mb-1.5 block text-xs text-[var(--color-text-muted)]">
            {t("addVariableExpense.note", { defaultValue: "Nota (opcional)" })}
          </label>
          <input
            id="edit-var-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
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
              ? t("common.saving", { defaultValue: "Guardando…" })
              : t("common.save")}
          </button>
        </div>
      </form>
    </AppSheet>
  );
}
