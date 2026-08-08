/** Inline categories section - full CRUD without modal. */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IoTrash, IoPencil } from "react-icons/io5";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { ExpenseCategory } from "@/api/types";
import { getCategoryIcon, CATEGORY_ICON_PICKER } from "@/components/dashboard/category-icon";
import { INPUT_CLASS, BTN_PRIMARY, BTN_SECONDARY, ICON_BTN, SECTION_CARD } from "@/lib/ui-a11y";
import { TYPE_DISPLAY, TYPE_LABEL } from "@/lib/typography";
import type { DashboardSection } from "@/lib/dashboard-state";

type Props = {
  categories: ExpenseCategory[];
  onChanged: () => void;
  onNavigate?: (section: DashboardSection) => void;
};

const PRESET_COLORS = [
  "#f59e0b", "#3b82f6", "#a855f7", "#ef4444",
  "#10b981", "#6366f1", "#ec4899", "#64748b",
  "#f97316", "#14b8a6", "#8b5cf6", "#06b6d4",
];

export function CategoriesSection({ categories, onChanged, onNavigate: _onNavigate }: Props) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState("#6366f1");
  const [formIcon, setFormIcon] = useState("Tag");
  const [formBudget, setFormBudget] = useState("");
  const [showForm, setShowForm] = useState(false);

  function resetForm() {
    setFormName("");
    setFormColor("#6366f1");
    setFormIcon("Tag");
    setFormBudget("");
    setEditingId(null);
    setShowForm(false);
  }

  const createMut = useMutation({
    mutationFn: (body: { name: string; color: string; icon: string | null; monthly_budget: number | null }) =>
      api<ExpenseCategory>("/api/categories", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["categories"] });
      resetForm();
      onChanged();
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<ExpenseCategory> }) =>
      api<ExpenseCategory>(`/api/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["categories"] });
      resetForm();
      onChanged();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      api(`/api/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["categories"] });
      onChanged();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const budget = formBudget.trim() ? Number(formBudget.replace(",", ".")) : null;
    
    if (editingId !== null) {
      updateMut.mutate({
        id: editingId,
        body: {
          name: formName,
          color: formColor,
          icon: formIcon,
          monthly_budget: budget,
        },
      });
    } else {
      createMut.mutate({
        name: formName,
        color: formColor,
        icon: formIcon,
        monthly_budget: budget,
      });
    }
  }

  function handleEdit(cat: ExpenseCategory) {
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormColor(cat.color);
    setFormIcon(cat.icon || "Tag");
    setFormBudget(cat.monthly_budget?.toString() ?? "");
    setShowForm(true);
  }

  return (
    <section className={`${SECTION_CARD} p-4 sm:p-5`}>
      <div className="mb-4 md:mb-5">
        <h2 className={TYPE_DISPLAY}>{t("nav.categories")}</h2>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4 space-y-4">
          <div>
            <label className={`mb-1 block ${TYPE_LABEL}`}>
              Nombre
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
              className={`w-full ${INPUT_CLASS}`}
              placeholder="Ej. Comida"
            />
          </div>

          <div>
            <label className={`mb-2 block ${TYPE_LABEL}`}>
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormColor(color)}
                  aria-label={color}
                  className={`min-h-11 min-w-11 rounded-full border-2 transition ${
                    formColor === color ? "border-[var(--color-text)]" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className={`mb-2 block ${TYPE_LABEL}`}>
              Icono
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_ICON_PICKER.map((opt) => {
                const OptIcon = opt.Icon;
                return (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => setFormIcon(opt.name)}
                    aria-label={opt.name}
                    className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border transition ${
                      formIcon === opt.name
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                        : "border-[var(--color-border)] hover:bg-[var(--color-panel)]"
                    }`}
                  >
                    <OptIcon className="h-5 w-5 text-[var(--color-text)]" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className={`mb-1 block ${TYPE_LABEL}`}>
              Presupuesto mensual (€)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={formBudget}
              onChange={(e) => setFormBudget(e.target.value)}
              className={`w-full ${INPUT_CLASS}`}
              placeholder="0.00"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={createMut.isPending || updateMut.isPending}
              className={`flex-1 ${BTN_PRIMARY} disabled:opacity-50`}
            >
              {editingId !== null ? "Actualizar" : "Crear"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className={`px-4 ${BTN_SECONDARY}`}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Categories List */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {categories.length === 0 ? (
          <p className="col-span-full py-8 text-center text-sm text-[var(--color-text-muted)]">
            No hay categorías. ¡Crea la primera!
          </p>
        ) : (
          categories.map((cat) => {
            const Icon = getCategoryIcon(cat.icon);
            return (
              <div
                key={cat.id}
                className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-2.5 py-2.5 sm:px-3"
              >
                <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <Icon className="gdh-icon shrink-0 text-[var(--color-text-muted)]" />
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-medium text-[var(--color-text)]">{cat.name}</span>
                    {cat.monthly_budget != null && cat.monthly_budget !== "" && (
                      <div className="truncate text-xs text-[var(--color-text-dim)]">
                        {String(cat.monthly_budget)}€/mes
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleEdit(cat)}
                    className={ICON_BTN}
                    aria-label="Editar"
                  >
                    <IoPencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`¿Eliminar "${cat.name}"?`)) {
                        deleteMut.mutate(cat.id);
                      }
                    }}
                    className={`${ICON_BTN} hover:text-[var(--color-crit)]`}
                    aria-label="Eliminar"
                  >
                    <IoTrash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className={`mt-4 w-full ${BTN_SECONDARY}`}
        >
          + Añadir categoría
        </button>
      )}
    </section>
  );
}
