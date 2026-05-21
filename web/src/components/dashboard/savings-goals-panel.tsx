/** Named savings targets with progress tracking. */
import { type FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IoAdd, IoRemove, IoTrashOutline } from "react-icons/io5";
import { api } from "@/api/client";
import type { SavingsGoal } from "@/api/types";
import { money } from "@/lib/format";

async function loadGoals() {
  return api<SavingsGoal[]>("/api/savings-goals");
}

function parseAmount(raw: string): number | null {
  const s = raw.trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

function progressPercent(current: string | number, target: string | number): number {
  const t = Number(target);
  const c = Number(current);
  if (!Number.isFinite(t) || t <= 0 || !Number.isFinite(c)) return 0;
  return Math.min(100, Math.round((c / t) * 1000) / 10);
}

type GoalRowProps = {
  goal: SavingsGoal;
  onDelete: (id: number) => void;
  deleting: boolean;
};

function GoalRow({ goal, onDelete, deleting }: GoalRowProps) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState(String(goal.current_amount ?? "0"));

  useEffect(() => {
    setDraft(String(goal.current_amount ?? "0"));
  }, [goal.id, goal.current_amount]);

  const patchMut = useMutation({
    mutationFn: (current_amount: number) =>
      api<SavingsGoal>(`/api/savings-goals/${goal.id}`, {
        method: "PATCH",
        body: JSON.stringify({ current_amount }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["savings-goals"] });
    },
  });

  function commitDraft() {
    const n = parseAmount(draft);
    if (n === null) {
      setDraft(String(goal.current_amount ?? "0"));
      return;
    }
    const current = Number(goal.current_amount);
    if (Number.isFinite(current) && Math.abs(n - current) < 0.005) return;
    patchMut.mutate(n);
  }

  function adjust(delta: number) {
    const base = parseAmount(draft) ?? Number(goal.current_amount) ?? 0;
    const next = Math.max(0, Math.round((base + delta) * 100) / 100);
    setDraft(String(next));
    patchMut.mutate(next);
  }

  const pct = progressPercent(goal.current_amount, goal.target_amount);

  return (
    <li className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-100">{goal.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Objetivo {money(goal.target_amount)}
            {goal.target_date ? (
              <span className="text-slate-600"> · {goal.target_date}</span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDelete(goal.id)}
          disabled={deleting}
          className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-rose-400 disabled:opacity-40"
          aria-label={`Eliminar meta ${goal.name}`}
        >
          <IoTrashOutline className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progreso de ${goal.name}`}
      >
        <div
          className="h-full rounded-full bg-teal-500 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">Ahorrado</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => adjust(-10)}
            disabled={patchMut.isPending}
            className="rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-300 hover:border-slate-600 disabled:opacity-40"
            aria-label="Restar 10 euros"
          >
            <IoRemove className="h-4 w-4" aria-hidden />
          </button>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            disabled={patchMut.isPending}
            className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-right text-sm outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/30"
            aria-label={`Cantidad ahorrada en ${goal.name}`}
          />
          <button
            type="button"
            onClick={() => adjust(10)}
            disabled={patchMut.isPending}
            className="rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-300 hover:border-slate-600 disabled:opacity-40"
            aria-label="Sumar 10 euros"
          >
            <IoAdd className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <span className="text-xs text-slate-500">
          {money(goal.current_amount)} / {money(goal.target_amount)} ({pct}%)
        </span>
      </div>
    </li>
  );
}

type PanelProps = {
  /** Ahorro reservado este mes (desde el resumen), solo informativo. */
  reservedSavings?: string | number;
};

export function SavingsGoalsPanel({ reservedSavings }: PanelProps) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const goalsQ = useQuery({
    queryKey: ["savings-goals"],
    queryFn: loadGoals,
  });

  const createMut = useMutation({
    mutationFn: (body: { name: string; target_amount: number }) =>
      api<SavingsGoal>("/api/savings-goals", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      setName("");
      setTarget("");
      setFormError(null);
      void qc.invalidateQueries({ queryKey: ["savings-goals"] });
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      api(`/api/savings-goals/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["savings-goals"] });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    const targetN = parseAmount(target);
    if (!trimmed) {
      setFormError("Escribe un nombre para la meta");
      return;
    }
    if (targetN === null || targetN <= 0) {
      setFormError("Indica un objetivo mayor que 0");
      return;
    }
    setFormError(null);
    createMut.mutate({ name: trimmed, target_amount: targetN });
  }

  const goals = goalsQ.data ?? [];

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/50 shadow-lg shadow-black/20">
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 className="text-lg font-bold tracking-tight">Metas de ahorro</h2>
        <p className="mt-1 text-sm text-slate-500">
          Objetivos con nombre y cantidad; actualiza lo que llevas ahorrado.
          {reservedSavings != null && Number(reservedSavings) > 0 && (
            <>
              {" "}
              Ahorro reservado este mes:{" "}
              <span className="text-teal-400/90">{money(reservedSavings)}</span>.
            </>
          )}
        </p>
      </div>
      <div className="space-y-4 p-5">
        {goalsQ.isPending && (
          <div className="h-16 animate-pulse rounded-xl bg-slate-800/40" aria-hidden />
        )}
        {goalsQ.error && (
          <p className="text-sm text-rose-300" role="alert">
            {(goalsQ.error as Error).message}
          </p>
        )}
        {!goalsQ.isPending && goals.length > 0 && (
          <ul className="space-y-3">
            {goals.map((g) => (
              <GoalRow
                key={g.id}
                goal={g}
                onDelete={(id) => deleteMut.mutate(id)}
                deleting={deleteMut.isPending}
              />
            ))}
          </ul>
        )}
        {!goalsQ.isPending && goals.length === 0 && !goalsQ.error && (
          <p className="text-sm text-slate-500">
            Aún no tienes metas. Añade una con nombre y objetivo en euros.
          </p>
        )}

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-2 border-t border-slate-800 pt-4 sm:flex-row sm:flex-wrap sm:items-end"
        >
          <input
            type="text"
            maxLength={80}
            placeholder="Nombre (ej. Vacaciones)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/30 sm:min-w-[140px] sm:flex-1"
          />
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            placeholder="Objetivo (€)"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/30 sm:w-32"
          />
          <button
            type="submit"
            disabled={createMut.isPending}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
          >
            Añadir meta
          </button>
        </form>
        {formError && (
          <p className="text-xs text-rose-300" role="alert">
            {formError}
          </p>
        )}
      </div>
    </section>
  );
}
