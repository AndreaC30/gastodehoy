/** Modal to create, edit, and delete expense categories. */
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IoClose } from "react-icons/io5";
import { api } from "@/api/client";
import type { ExpenseCategory } from "@/api/types";
import {
  CATEGORY_ICON_PICKER,
  getCategoryIcon,
} from "@/components/dashboard/category-icon";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useDialogA11y } from "@/lib/use-dialog-a11y";
import { ModalMenuFooter } from "@/components/modal-menu-footer";
import { BTN_PRIMARY, BTN_SECONDARY, FOCUS_RING, INPUT_CLASS } from "@/lib/ui-a11y";

type Props = {
  categories: ExpenseCategory[];
  onClose: () => void;
  onBackToMenu?: () => void;
  onChanged: () => void;
};

const PRESET_COLORS = [
  "#f59e0b", "#3b82f6", "#a855f7", "#ef4444",
  "#10b981", "#6366f1", "#ec4899", "#64748b",
  "#f97316", "#14b8a6", "#8b5cf6", "#06b6d4",
];

export function CategoryManager({
  categories,
  onClose,
  onBackToMenu,
  onChanged,
}: Props) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState("#6366f1");
  const [formIcon, setFormIcon] = useState("Tag");
  const [formBudget, setFormBudget] = useState("");
  const [error, setError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  useBodyScrollLock(true);
  useDialogA11y(true, panelRef);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function parseBudgetInput(raw: string): number | null {
    const s = raw.trim().replace(",", ".");
    if (!s) return null;
    const n = Number(s);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n * 100) / 100;
  }

  const createMut = useMutation({
    mutationFn: (body: {
      name: string;
      color: string;
      icon: string | null;
      monthly_budget: number | null;
    }) =>
      api<ExpenseCategory>("/api/categories", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["categories"] });
      void qc.invalidateQueries({ queryKey: ["insights"] });
      resetForm();
      onChanged();
    },
    onError: (e: Error) => setError(e.message),
  });

  const updateMut = useMutation({
    mutationFn: (body: {
      id: number;
      name: string;
      color: string;
      icon: string | null;
      monthly_budget: number | null;
    }) =>
      api<ExpenseCategory>(`/api/categories/${body.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: body.name,
          color: body.color,
          icon: body.icon,
          monthly_budget: body.monthly_budget,
        }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["categories"] });
      void qc.invalidateQueries({ queryKey: ["insights"] });
      resetForm();
      onChanged();
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api(`/api/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["categories"] });
      void qc.invalidateQueries({ queryKey: ["insights"] });
      onChanged();
    },
    onError: (e: Error) => setError(e.message),
  });

  function resetForm() {
    setEditingId(null);
    setFormName("");
    setFormColor("#6366f1");
    setFormIcon("Tag");
    setFormBudget("");
    setError(null);
  }

  function startEdit(cat: ExpenseCategory) {
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormColor(cat.color);
    setFormIcon(cat.icon ?? "Tag");
    setFormBudget(
      cat.monthly_budget != null && cat.monthly_budget !== ""
        ? String(cat.monthly_budget)
        : "",
    );
    setError(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;
    const monthly_budget = parseBudgetInput(formBudget);
    if (editingId) {
      updateMut.mutate({
        id: editingId,
        name: formName.trim(),
        color: formColor,
        icon: formIcon.trim() || null,
        monthly_budget,
      });
    } else {
      createMut.mutate({
        name: formName.trim(),
        color: formColor,
        icon: formIcon.trim() || null,
        monthly_budget,
      });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex touch-none items-end justify-center overflow-hidden bg-black/60 p-3 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-manager-title"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="modal-scroll max-h-[min(85vh,100dvh)] w-full max-w-lg touch-auto overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-t-2xl border border-slate-700 bg-slate-900 p-4 pr-3 shadow-2xl sm:rounded-2xl sm:p-6 sm:pr-5"
      >
        <div className="flex min-w-0 items-center justify-between gap-3">
          <h2 id="category-manager-title" className="min-w-0 flex-1 text-lg font-bold">
            {t("categoryManager.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            aria-label={t("common.close")}
          >
            <IoClose className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {error && (
          <p
            className="mt-3 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200"
            role="alert"
          >
            {error}
          </p>
        )}

        <ul className="mt-4 space-y-2">
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat.icon);
            return (
              <li
                key={cat.id}
                className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className="h-4 w-4 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                    {cat.name}
                    {cat.monthly_budget != null && cat.monthly_budget !== "" && (
                      <span className="text-xs text-slate-500">
                        {" "}
                        · {String(cat.monthly_budget)}€/mes
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex shrink-0 gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => startEdit(cat)}
                    className={`min-h-11 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 ${FOCUS_RING}`}
                    aria-label={t("categoryManager.editCategory", { name: cat.name })}
                  >
                    {t("common.edit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMut.mutate(cat.id)}
                    disabled={deleteMut.isPending}
                    className={`min-h-11 rounded-lg px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 disabled:opacity-50 ${FOCUS_RING}`}
                    aria-label={t("categoryManager.deleteCategory", { name: cat.name })}
                  >
                    {t("common.delete")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <form className="mt-6 space-y-3" onSubmit={onSubmit}>
          <h3 className="text-sm font-semibold text-slate-300">
            {editingId ? t("categoryManager.editForm") : t("categoryManager.newForm")}
          </h3>
          <div>
            <label htmlFor="cat-form-name" className="mb-1 block text-xs text-slate-500">
              {t("categoryManager.name")}
            </label>
            <input
              id="cat-form-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder={t("categoryManager.namePlaceholder")}
              required
              maxLength={80}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label htmlFor="cat-form-budget" className="mb-1 block text-xs text-slate-500">
              {t("categoryManager.budget")}
            </label>
            <input
              id="cat-form-budget"
              type="text"
              inputMode="decimal"
              value={formBudget}
              onChange={(e) => setFormBudget(e.target.value)}
              placeholder={t("categoryManager.budgetPlaceholder")}
              className={INPUT_CLASS}
            />
            <p className="mt-1 text-xs text-slate-600">
              {t("categoryManager.budgetHint")}
            </p>
          </div>

          <fieldset>
            <legend className="mb-2 text-xs text-slate-500">{t("categoryManager.color")}</legend>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFormColor(c)}
                  className={`h-7 w-7 rounded-full border-2 ${
                    formColor === c ? "border-white" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={t("categoryManager.color") + " " + c}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-xs text-slate-500">{t("categoryManager.icon")}</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_ICON_PICKER.map((opt) => {
                const OptIcon = opt.Icon;
                return (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => setFormIcon(opt.name)}
                    className={`rounded-lg border p-2 ${
                      formIcon === opt.name
                        ? "border-sky-500 bg-sky-500/20"
                        : "border-slate-700 hover:border-slate-500"
                    }`}
                    aria-label={opt.name}
                  >
                    <OptIcon className="h-5 w-5 text-slate-300" />
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createMut.isPending || updateMut.isPending}
              className={BTN_PRIMARY}
            >
              {editingId ? t("common.save") : t("common.create")}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className={BTN_SECONDARY}
              >
                {t("common.cancel")}
              </button>
            )}
          </div>
        </form>

        <ModalMenuFooter className="mt-4" onBackToMenu={onBackToMenu} onClose={onClose} />
      </div>
    </div>
  );
}
