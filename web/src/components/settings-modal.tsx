/**
 * Modal dialog used by the dashboard's gear button to edit the same
 * fields that the onboarding wizard captured (income + savings rule).
 */
import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { IoClose } from "react-icons/io5";
import { api } from "@/api/client";
import type { ExtraIncome, SavingsMode, Settings } from "@/api/types";
import { money } from "@/lib/format";

type Props = {
  initial: Settings;
  extras: ExtraIncome[];
  onClose: () => void;
  onSaved: (next: Settings) => void;
  onExtrasChanged: () => void;
};

function todayIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Controlled modal: pre-fills with `initial` and reports the saved row. */
export function SettingsModal({
  initial,
  extras,
  onClose,
  onSaved,
  onExtrasChanged,
}: Props) {
  const [income, setIncome] = useState(String(initial.monthly_income ?? ""));
  const [mode, setMode] = useState<SavingsMode>(initial.savings_mode);
  const [percent, setPercent] = useState(String(initial.savings_percent ?? "0"));
  const [amount, setAmount] = useState(String(initial.savings_amount ?? "0"));
  const [extraAmount, setExtraAmount] = useState("");
  const [extraDate, setExtraDate] = useState(todayIsoLocal);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const addExtra = useMutation({
    mutationFn: (body: { amount: string; received_at: string }) =>
      api<ExtraIncome>("/api/extra-income", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      setExtraAmount("");
      setExtraDate(todayIsoLocal());
      onExtrasChanged();
    },
    onError: (e: Error) => setError(e.message),
  });

  const delExtra = useMutation({
    mutationFn: (id: number) =>
      api(`/api/extra-income/${id}`, { method: "DELETE" }),
    onSuccess: () => onExtrasChanged(),
    onError: (e: Error) => setError(e.message),
  });

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

  function addExtraIncomeRow() {
    setError(null);
    const n = Number(extraAmount.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) {
      setError("Indica una cantidad mayor que cero para el ingreso extra.");
      return;
    }
    addExtra.mutate({
      amount: extraAmount,
      received_at: extraDate,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              Configura tus ingresos
            </h2>
            <p className="text-sm text-slate-500">
              Ingreso mensual, ahorro e ingresos extra del mes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg border border-slate-800 p-1.5 text-slate-400 hover:bg-slate-800/60"
          >
            <IoClose className="h-5 w-5" aria-hidden />
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
              <>
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
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Se calcula solo sobre el ingreso mensual; los ingresos extra
                  no aumentan este porcentaje.
                </p>
              </>
            ) : (
              <>
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
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Cantidad fija al mes, aparte del ingreso mensual; los extras no la
                  modifican.
                </p>
              </>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <p className="text-sm font-medium text-slate-300">Ingresos extra</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Pagos puntuales en otro día (bonus, nómina extra…). Solo cuentan si la
              fecha cae en este mes. Se suman a tu margen después del ahorro.
            </p>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                placeholder="Cantidad (€)"
                value={extraAmount}
                onChange={(e) => setExtraAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/40 sm:min-w-[100px] sm:flex-1"
              />
              <input
                type="date"
                value={extraDate}
                onChange={(e) => setExtraDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/40 sm:w-auto"
              />
              <button
                type="button"
                onClick={addExtraIncomeRow}
                disabled={addExtra.isPending}
                className="w-full rounded-lg border border-teal-500/50 bg-teal-500/15 px-3 py-2 text-sm font-semibold text-teal-200 hover:bg-teal-500/25 disabled:opacity-60 sm:w-auto"
              >
                Añadir
              </button>
            </div>

            <ul className="mt-3 space-y-2">
              {extras.length === 0 ? (
                <li className="text-sm text-slate-600">Ninguno este mes.</li>
              ) : (
                extras.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2"
                  >
                    <div>
                      <p className="font-semibold text-teal-300/90">
                        {money(it.amount)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Recibido el {it.received_at}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => delExtra.mutate(it.id)}
                      disabled={delExtra.isPending}
                      className="shrink-0 rounded-lg border border-rose-500/40 px-2 py-1 text-xs font-medium text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"
                    >
                      Quitar
                    </button>
                  </li>
                ))
              )}
            </ul>
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
