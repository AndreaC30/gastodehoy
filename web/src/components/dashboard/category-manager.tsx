/** Modal to create, edit, and delete expense categories. */
import { type FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { ExpenseCategory } from "@/api/types";
import { getCategoryIcon } from "@/components/dashboard/category-icon";
import {
  UtensilsCrossed,
  Car,
  Gamepad2,
  HeartPulse,
  GraduationCap,
  Home,
  Shirt,
  Package,
  ShoppingCart,
  Wifi,
  Zap,
  Baby,
  Plane,
  Gift,
  Coffee,
  type LucideProps,
} from "lucide-react";

type Props = {
  categories: ExpenseCategory[];
  onClose: () => void;
  onChanged: () => void;
};

const PRESET_COLORS = [
  "#f59e0b", "#3b82f6", "#a855f7", "#ef4444",
  "#10b981", "#6366f1", "#ec4899", "#64748b",
  "#f97316", "#14b8a6", "#8b5cf6", "#06b6d4",
];

const ICON_OPTIONS: { name: string; component: React.ComponentType<LucideProps> }[] = [
  { name: "UtensilsCrossed", component: UtensilsCrossed },
  { name: "Car", component: Car },
  { name: "Gamepad2", component: Gamepad2 },
  { name: "HeartPulse", component: HeartPulse },
  { name: "GraduationCap", component: GraduationCap },
  { name: "Home", component: Home },
  { name: "Shirt", component: Shirt },
  { name: "Package", component: Package },
  { name: "ShoppingCart", component: ShoppingCart },
  { name: "Wifi", component: Wifi },
  { name: "Zap", component: Zap },
  { name: "Baby", component: Baby },
  { name: "Plane", component: Plane },
  { name: "Gift", component: Gift },
  { name: "Coffee", component: Coffee },
];

export function CategoryManager({ categories, onClose, onChanged }: Props) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState("#6366f1");
  const [formIcon, setFormIcon] = useState("Tag");
  const [error, setError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (body: { name: string; color: string; icon: string | null }) =>
      api<ExpenseCategory>("/api/categories", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["categories"] });
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
    }) =>
      api<ExpenseCategory>(`/api/categories/${body.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: body.name, color: body.color, icon: body.icon }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["categories"] });
      resetForm();
      onChanged();
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api(`/api/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["categories"] });
      onChanged();
    },
    onError: (e: Error) => setError(e.message),
  });

  function resetForm() {
    setEditingId(null);
    setFormName("");
    setFormColor("#6366f1");
    setFormIcon("Tag");
    setError(null);
  }

  function startEdit(cat: ExpenseCategory) {
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormColor(cat.color);
    setFormIcon(cat.icon ?? "Tag");
    setError(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;
    if (editingId) {
      updateMut.mutate({
        id: editingId,
        name: formName.trim(),
        color: formColor,
        icon: formIcon.trim() || null,
      });
    } else {
      createMut.mutate({
        name: formName.trim(),
        color: formColor,
        icon: formIcon.trim() || null,
      });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Gestionar categorías"
    >
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Categorías de gasto</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        )}

        {/* Existing categories */}
        <ul className="mt-4 space-y-2">
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat.icon);
            return (
              <li
                key={cat.id}
                className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5"
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="flex-1 text-sm text-slate-200">
                  {cat.name}
                </span>
                <button
                  type="button"
                  onClick={() => startEdit(cat)}
                  className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => deleteMut.mutate(cat.id)}
                  disabled={deleteMut.isPending}
                  className="rounded px-2 py-1 text-xs text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"
                >
                  Borrar
                </button>
              </li>
            );
          })}
        </ul>

        {/* Add / Edit form */}
        <form className="mt-6 space-y-3" onSubmit={onSubmit}>
          <h3 className="text-sm font-semibold text-slate-300">
            {editingId ? "Editar categoría" : "Nueva categoría"}
          </h3>
          <div className="flex gap-2">
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Nombre"
              required
              maxLength={80}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/40"
            />
          </div>

          {/* Color picker */}
          <div>
            <p className="mb-2 text-xs text-slate-500">Color</p>
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
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Icon picker */}
          <div>
            <p className="mb-2 text-xs text-slate-500">Icono</p>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((opt) => {
                const OptIcon = opt.component;
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
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createMut.isPending || updateMut.isPending}
              className="rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-60"
            >
              {editingId ? "Guardar" : "Crear"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
