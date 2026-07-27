/** Inline savings goals section - full functionality without modal. */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IoClose, IoTrash, IoPencil, IoFlag } from "react-icons/io5";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/api/client";
import { INPUT_CLASS, BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui-a11y";

type Goal = {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  icon?: string | null;
  color?: string | null;
};

type Props = {
  reservedSavings?: number;
  onSaved: () => void;
};

export function SavingsGoalsSection({ reservedSavings = 0, onSaved }: Props) {
  const { t } = useTranslation();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formCurrent, setFormCurrent] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Fetch goals on mount
  useState(() => {
    api<Goal[]>("/api/savings-goals").then((data) => {
      setGoals(data);
    }).catch(() => {
      // Goals endpoint might not exist yet
      setGoals([]);
    });
  });

  function resetForm() {
    setFormName("");
    setFormTarget("");
    setFormCurrent("");
    setEditingId(null);
    setShowForm(false);
  }

  const createMut = useMutation({
    mutationFn: (body: { name: string; target_amount: number; current_amount: number }) =>
      api<Goal>("/api/savings-goals", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (newGoal) => {
      setGoals((prev) => [...prev, newGoal]);
      resetForm();
      onSaved();
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<Goal> }) =>
      api<Goal>(`/api/savings-goals/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: (updatedGoal) => {
      setGoals((prev) => prev.map((g) => (g.id === updatedGoal.id ? updatedGoal : g)));
      resetForm();
      onSaved();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      api(`/api/savings-goals/${id}`, { method: "DELETE" }),
    onSuccess: (_, deletedId) => {
      setGoals((prev) => prev.filter((g) => g.id !== deletedId));
      onSaved();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const target = Number(formTarget.replace(",", "."));
    const current = Number(formCurrent.replace(",", "."));
    
    if (editingId !== null) {
      updateMut.mutate({
        id: editingId,
        body: {
          name: formName,
          target_amount: target,
          current_amount: current,
        },
      });
    } else {
      createMut.mutate({
        name: formName,
        target_amount: target,
        current_amount: current,
      });
    }
  }

  function handleEdit(goal: Goal) {
    setEditingId(goal.id);
    setFormName(goal.name);
    setFormTarget(goal.target_amount.toString());
    setFormCurrent(goal.current_amount.toString());
    setShowForm(true);
  }

  function getProgress(current: number, target: number): number {
    if (target <= 0) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  }

  return (
    <section className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-panel)] shadow-[var(--shadow-surface)] p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[var(--color-text)]">{t("nav.savingsGoals")}</h2>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('navigate-section', { detail: 'hoy' }))}
          className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-panel)] hover:text-[var(--color-text)]"
          aria-label="Volver"
        >
          <IoClose className="h-5 w-5" />
        </button>
      </div>

      {/* Summary */}
      <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
        <p className="text-sm text-[var(--color-text-muted)]">Ahorro reservado</p>
        <p className="text-2xl font-bold text-[var(--color-text)]">{reservedSavings.toFixed(2)} €</p>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
              Nombre de la meta
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
              className={`w-full ${INPUT_CLASS}`}
              placeholder="Ej. Viaje a Japón"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
              Objetivo (€)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={formTarget}
              onChange={(e) => setFormTarget(e.target.value)}
              required
              className={`w-full ${INPUT_CLASS}`}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
              Ahorrado hasta ahora (€)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={formCurrent}
              onChange={(e) => setFormCurrent(e.target.value)}
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
              {editingId !== null ? "Actualizar" : "Crear meta"}
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

      {/* Goals List */}
      <div className="space-y-4">
        {goals.length === 0 ? (
          <div className="text-center py-8">
            <IoFlag className="h-12 w-12 mx-auto text-[var(--color-text-muted)] mb-3" />
            <p className="text-sm text-[var(--color-text-muted)]">
              No tienes metas de ahorro. ¡Crea la primera!
            </p>
          </div>
        ) : (
          goals.map((goal) => {
            const progress = getProgress(goal.current_amount, goal.target_amount);
            return (
              <div
                key={goal.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-[var(--color-text)]">{goal.name}</h3>
                    <p className="text-sm text-[var(--color-text-dim)]">
                      {goal.current_amount.toFixed(2)} € / {goal.target_amount.toFixed(2)} €
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(goal)}
                      className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                      aria-label="Editar"
                    >
                      <IoPencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`¿Eliminar "${goal.name}"?`)) {
                          deleteMut.mutate(goal.id);
                        }
                      }}
                      className="p-2 text-[var(--color-text-muted)] hover:text-red-500"
                      aria-label="Eliminar"
                    >
                      <IoTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="h-3 w-full rounded-full bg-[var(--color-border)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--color-accent)] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--color-text-dim)] mt-1">{progress}% completado</p>
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
          + Añadir meta de ahorro
        </button>
      )}
    </section>
  );
}
