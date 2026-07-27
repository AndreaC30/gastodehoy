/** Inline categories section - full CRUD without modal. */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IoClose, IoTrash, IoPencil } from "react-icons/io5";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { ExpenseCategory } from "@/api/types";
import { getCategoryIcon, CATEGORY_ICON_PICKER } from "@/components/dashboard/category-icon";
import { INPUT_CLASS, BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui-a11y";
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

export function CategoriesSection({ categories, onChanged, onNavigate }: Props) {
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
    <section className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-panel)] shadow-[var(--shadow-surface)] p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[var(--color-text)]">{t("nav.categories")}</h2>
        <button
          type="button"
          onClick={() => onNavigate?.("hoy")}
          className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-panel)] hover:text-[var(--color-text)]"
          aria-label="Volver"
        >
          <IoClose className="h-5 w-5" />
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
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
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormColor(color)}
                  className={`h-8 w-8 rounded-full border-2 transition ${
                    formColor === color ? "border-[var(--color-text)]" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
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
                    className={`h-10 w-10 flex items-center justify-center rounded-lg border transition ${
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
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
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
      <div className="space-y-2">
        {categories.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
            No hay categorías. ¡Crea la primera!
          </p>
        ) : (
          categories.map((cat) => {
            const Icon = getCategoryIcon(cat.icon);
            return (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-4 w-4 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <Icon className="gdh-icon-lg shrink-0 text-[var(--color-text-muted)]" />
                  <div>
                    <span className="text-sm font-medium text-[var(--color-text)]">{cat.name}</span>
                    {cat.monthly_budget != null && cat.monthly_budget !== "" && (
                      <div className="text-xs text-[var(--color-text-dim)]">
                        {String(cat.monthly_budget)}€/mes
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleEdit(cat)}
                    className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
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
                    className="p-2 text-[var(--color-text-muted)] hover:text-red-500"
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
