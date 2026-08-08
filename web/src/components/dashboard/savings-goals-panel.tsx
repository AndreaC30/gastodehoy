/** Named savings targets with progress tracking. */
import { useTranslation } from "react-i18next";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IoAdd, IoRemove, IoTrashOutline } from "react-icons/io5";
import { api } from "@/api/client";
import type { SavingsGoal } from "@/api/types";
import { money } from "@/lib/format";
import { hapticSuccess } from "@/lib/haptics";
import { FOCUS_RING, BTN_PRIMARY, ICON_BTN } from "@/lib/ui-a11y";

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
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [draft, setDraft] = useState(String(goal.current_amount ?? "0"));
  const prevPct = useRef(0);

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

  // Haptic pulse when goal reaches 100%
  useEffect(() => {
    if (prevPct.current < 100 && pct >= 100) {
      hapticSuccess();
    }
    prevPct.current = pct;
  }, [pct]);

  return (
    <li className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[var(--color-text)]">{goal.name}</p>
          <p className="mt-0.5 text-xs text-[var(--color-text-dim)]">
            {t("savingsGoals.target", { amount: money(goal.target_amount) })}
            {goal.target_date ? (
              <span className="text-[var(--color-text-dim)]"> · {goal.target_date}</span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDelete(goal.id)}
          disabled={deleting}
          className={`${ICON_BTN} hover:text-[var(--color-crit)] disabled:opacity-40`}
          aria-label={t("savingsGoals.deleteLabel", { name: goal.name })}
        >
          <IoTrashOutline className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-border)]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("savingsGoals.progress", { name: goal.name })}
      >
        <div
          className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--color-text-dim)]">{t("savingsGoals.saved")}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => adjust(-10)}
            disabled={patchMut.isPending}
            className={`${ICON_BTN} border border-[var(--color-border-subtle)] bg-[var(--color-panel)] hover:border-[var(--color-border)] disabled:opacity-40`}
            aria-label={t("savingsGoals.subtract10")}
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
            className={`w-24 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-soft)] px-2 py-1.5 text-right text-sm ${FOCUS_RING}`}
            aria-label={t("savingsGoals.savedAmount", { name: goal.name })}
          />
          <button
            type="button"
            onClick={() => adjust(10)}
            disabled={patchMut.isPending}
            className={`${ICON_BTN} border border-[var(--color-border-subtle)] bg-[var(--color-panel)] hover:border-[var(--color-border)] disabled:opacity-40`}
            aria-label={t("savingsGoals.add10")}
          >
            <IoAdd className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <span className="text-xs text-[var(--color-text-dim)]">
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

export function SavingsGoalsContent({ reservedSavings }: PanelProps) {
  const { t } = useTranslation();
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
      setFormError(t("savingsGoals.nameError"));
      return;
    }
    if (targetN === null || targetN <= 0) {
      setFormError(t("savingsGoals.amountError"));
      return;
    }
    setFormError(null);
    createMut.mutate({ name: trimmed, target_amount: targetN });
  }

  const goals = goalsQ.data ?? [];

  return (
    <div className="space-y-4">
      {reservedSavings != null && Number(reservedSavings) > 0 && (
        <p className="rounded-xl border border-[var(--color-accent-border)] bg-[var(--color-accent-dim)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
          {t("savingsGoals.reservedThisMonth")}{" "}
          <span className="font-semibold text-[var(--color-accent)]">{money(reservedSavings)}</span>
        </p>
      )}
        {goalsQ.isPending && (
          <div className="h-16 animate-pulse rounded-xl bg-[var(--color-border)]/40" aria-hidden />
        )}
        {goalsQ.error && (
          <p className="text-sm text-[var(--color-crit)]" role="alert">
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
          <p className="text-sm text-[var(--color-text-dim)]">
            {t("savingsGoals.empty")}
          </p>
        )}

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:flex-wrap sm:items-end"
        >
          <input
            type="text"
            maxLength={80}
            placeholder={t("savingsGoals.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full min-w-0 max-w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-soft)] px-3 py-2 text-sm sm:min-w-0 sm:flex-1 ${FOCUS_RING}`}
          />
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            placeholder={t("savingsGoals.targetPlaceholder")}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className={`w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-soft)] px-3 py-2 text-sm sm:w-32 ${FOCUS_RING}`}
          />
          <button
            type="submit"
            disabled={createMut.isPending}
            className={BTN_PRIMARY}
          >
            {t("savingsGoals.addGoal")}
          </button>
        </form>
        {formError && (
          <p className="text-xs text-[var(--color-crit)]" role="alert">
            {formError}
          </p>
        )}
    </div>
  );
}
