/**
 * Modal dialog used by the dashboard's gear button to edit the same
 * fields that the onboarding wizard captured (income + savings rule).
 */
import { type FormEvent, useEffect, useState } from "react";
import { api } from "@/api/client";
import type { SavingsMode, Settings } from "@/api/types";

type Props = {
  initial: Settings;
  onClose: () => void;
  onSaved: (next: Settings) => void;
};

/** Controlled modal: pre-fills with `initial` and reports the saved row. */
export function SettingsModal({ initial, onClose, onSaved }: Props) {
  const [income, setIncome] = useState(String(initial.monthly_income ?? ""));
  const [mode, setMode] = useState<SavingsMode>(initial.savings_mode);
  const [percent, setPercent] = useState(String(initial.savings_percent ?? "0"));
  const [amount, setAmount] = useState(String(initial.savings_amount ?? "0"));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const next = await api<Settings>("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          monthly_income: income || "0",
          savings_mode: mode,
          savings_percent: mode === "percent" ? percent || "0" : "0",
          savings_amount: mode === "fixed" ? amount || "0" : "0",
        }),
      });
      onSaved(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Ajustes</h2>
            <p className="text-sm text-slate-500">Ingreso y ahorro mensual.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg border border-slate-800 px-2 py-1 text-sm text-slate-400 hover:bg-slate-800/60"
          >
            ✕
          </button>
        </header>

        {error && (
          <div className="mb-3 rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-400">
            Ingreso mensual (€)
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              required
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/40"
            />
          </label>

          <div>
            <p className="text-sm font-medium text-slate-400">Ahorro</p>
            <div className="mt-1.5 grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-1 text-sm">
              <ModeBtn
                active={mode === "percent"}
                onClick={() => setMode("percent")}
              >
                % del sueldo
              </ModeBtn>
              <ModeBtn
                active={mode === "fixed"}
                onClick={() => setMode("fixed")}
              >
                Cantidad fija
              </ModeBtn>
            </div>

            {mode === "percent" ? (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  max={100}
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/40"
                />
                <span className="text-slate-500">%</span>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/40"
                />
                <span className="text-slate-500">€</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-60"
            >
              {busy ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Pill button used to switch between "% del sueldo" and "Cantidad fija". */
function ModeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 font-medium transition ${
        active
          ? "bg-slate-900 text-slate-100 shadow-inner"
          : "text-slate-500 hover:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}
