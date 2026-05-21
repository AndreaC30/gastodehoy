/**
 * Modal dialog used by the dashboard's gear button to edit the same
 * fields that the onboarding wizard captured (income + savings rule).
 */
import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { IoClose } from "react-icons/io5";
import { api } from "@/api/client";
import type {
  ExtraIncome,
  ExtraIncomeSavingsMode,
  SavingsMode,
  Settings,
} from "@/api/types";
import { FormField } from "@/components/ui/form-field";
import { money } from "@/lib/format";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useDialogA11y } from "@/lib/use-dialog-a11y";
import { INPUT_CLASS, INPUT_FLEX_CLASS } from "@/lib/ui-a11y";

type Props = {
  initial: Settings;
  extras: ExtraIncome[];
  onClose: () => void;
  onSaved: (next: Settings) => void;
  onExtrasChanged: () => void;
};

const inputClass = `${INPUT_CLASS} py-2.5`;

const inputClassSm = `${INPUT_CLASS} text-sm`;

type SettingsTab = "monthly" | "extra";

function describeExtraSavings(it: ExtraIncome): string {
  const mode = it.savings_mode ?? "none";
  if (mode === "all") return "Todo reservado · no suma al margen";
  if (mode === "percent") {
    return `Ahorro ${it.savings_percent}% de este ingreso`;
  }
  if (mode === "fixed") {
    return `Ahorro fijo ${money(it.savings_fixed)}`;
  }
  return "Todo disponible para gastar";
}

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
  const [tab, setTab] = useState<SettingsTab>("monthly");
  const [extraAmount, setExtraAmount] = useState("");
  const [extraDate, setExtraDate] = useState(todayIsoLocal);
  const [extraSavingsMode, setExtraSavingsMode] =
    useState<ExtraIncomeSavingsMode>("none");
  const [extraSavingsPercent, setExtraSavingsPercent] = useState("0");
  const [extraSavingsFixed, setExtraSavingsFixed] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(true);
  useDialogA11y(true, panelRef);

  const addExtra = useMutation({
    mutationFn: (body: {
      amount: string;
      received_at: string;
      savings_mode: ExtraIncomeSavingsMode;
      savings_percent: string;
      savings_fixed: string;
    }) =>
      api<ExtraIncome>("/api/extra-income", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      setExtraAmount("");
      setExtraDate(todayIsoLocal());
      setExtraSavingsMode("none");
      setExtraSavingsPercent("0");
      setExtraSavingsFixed("0");
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
    if (extraSavingsMode === "percent") {
      const pct = Number(extraSavingsPercent.replace(",", "."));
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        setError("El porcentaje a ahorrar debe estar entre 0 y 100.");
        return;
      }
    }
    if (extraSavingsMode === "fixed") {
      const fixed = Number(extraSavingsFixed.replace(",", "."));
      if (!Number.isFinite(fixed) || fixed < 0) {
        setError("Indica una cantidad fija a ahorrar válida.");
        return;
      }
      if (fixed > n) {
        setError("No puedes ahorrar más que el importe del ingreso extra.");
        return;
      }
    }
    addExtra.mutate({
      amount: extraAmount,
      received_at: extraDate,
      savings_mode: extraSavingsMode,
      savings_percent:
        extraSavingsMode === "percent" ? extraSavingsPercent || "0" : "0",
      savings_fixed: extraSavingsMode === "fixed" ? extraSavingsFixed || "0" : "0",
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex touch-none items-end justify-center overflow-hidden bg-black/60 px-3 py-4 sm:items-center sm:px-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="modal-scroll max-h-[min(90vh,100dvh)] w-full max-w-md touch-auto overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-t-2xl border border-slate-800 bg-slate-900 p-4 pr-3 shadow-2xl shadow-black/50 sm:rounded-2xl sm:p-5 sm:pr-4"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2
              id="settings-modal-title"
              className="text-lg font-bold tracking-tight"
            >
              Configura tus ingresos
            </h2>
            <p className="text-sm text-slate-500">
              Ingreso mensual, ahorro del sueldo e ingresos extra del mes.
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
          <div
            className="mb-3 rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        <div
          className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1 text-sm"
          role="tablist"
          aria-label="Secciones de ingresos"
        >
          <TabBtn
            active={tab === "monthly"}
            onClick={() => setTab("monthly")}
            id="settings-tab-monthly"
            controls="settings-panel-monthly"
          >
            Ingreso mensual
          </TabBtn>
          <TabBtn
            active={tab === "extra"}
            onClick={() => setTab("extra")}
            id="settings-tab-extra"
            controls="settings-panel-extra"
          >
            Ingresos extra
          </TabBtn>
        </div>

        {tab === "monthly" ? (
          <form
            id="settings-panel-monthly"
            role="tabpanel"
            aria-labelledby="settings-tab-monthly"
            onSubmit={submit}
            className="space-y-4"
          >
            <FormField id="settings-income" label="Ingreso mensual (€)">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                required
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                className={inputClass}
              />
            </FormField>

            <div>
              <p
                id="settings-savings-label"
                className="text-sm font-medium text-slate-400"
              >
                Ahorro del sueldo
              </p>
              <div
                className="mt-1.5 grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-1 text-sm"
                role="group"
                aria-labelledby="settings-savings-label"
              >
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
                <SavingsInputRow
                  id="settings-savings-percent"
                  label="Porcentaje de ahorro"
                  suffix="%"
                  hint="Solo sobre el ingreso mensual. Los extras tienen su propia regla en la otra pestaña."
                  value={percent}
                  onChange={setPercent}
                  max={100}
                />
              ) : (
                <SavingsInputRow
                  id="settings-savings-amount"
                  label="Cantidad fija al mes (€)"
                  suffix="€"
                  hint="Fija cada mes, aparte del ingreso mensual."
                  value={amount}
                  onChange={setAmount}
                />
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
        ) : (
          <div
            id="settings-panel-extra"
            role="tabpanel"
            aria-labelledby="settings-tab-extra"
            className="space-y-4"
          >
            <p className="text-sm leading-relaxed text-slate-400">
              Bonus, nómina extra… Solo cuentan si la fecha cae en este mes. Lo que
              reserves aquí no suma a «Hoy puedes gastar»; el resto sí.
            </p>

            <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap">
              <FormField
                id="settings-extra-amount"
                label="Cantidad (€)"
                className="w-full min-w-0 lg:flex-1"
              >
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  placeholder="Ej. 150"
                  value={extraAmount}
                  onChange={(e) => setExtraAmount(e.target.value)}
                  className={inputClassSm}
                />
              </FormField>
              <FormField
                id="settings-extra-date"
                label="Fecha de cobro"
                className="w-full lg:w-auto"
              >
                <input
                  type="date"
                  value={extraDate}
                  onChange={(e) => setExtraDate(e.target.value)}
                  className={inputClassSm}
                />
              </FormField>
            </div>

            <div>
              <p
                id="settings-extra-savings-label"
                className="text-sm font-medium text-slate-400"
              >
                ¿Cuánto ahorrar de este ingreso?
              </p>
              <div
                className="mt-1.5 grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-1 text-sm"
                role="group"
                aria-labelledby="settings-extra-savings-label"
              >
                <ModeBtn
                  active={extraSavingsMode === "none"}
                  onClick={() => setExtraSavingsMode("none")}
                >
                  Gastar todo
                </ModeBtn>
                <ModeBtn
                  active={extraSavingsMode === "all"}
                  onClick={() => setExtraSavingsMode("all")}
                >
                  Ahorrar todo
                </ModeBtn>
                <ModeBtn
                  active={extraSavingsMode === "percent"}
                  onClick={() => setExtraSavingsMode("percent")}
                >
                  Un %
                </ModeBtn>
                <ModeBtn
                  active={extraSavingsMode === "fixed"}
                  onClick={() => setExtraSavingsMode("fixed")}
                >
                  Cantidad fija
                </ModeBtn>
              </div>

              {extraSavingsMode === "percent" && (
                <SavingsInputRow
                  id="settings-extra-savings-percent"
                  label="Porcentaje a reservar"
                  suffix="%"
                  hint="Ese porcentaje del ingreso extra no entra en tu margen de gasto."
                  value={extraSavingsPercent}
                  onChange={setExtraSavingsPercent}
                  max={100}
                />
              )}
              {extraSavingsMode === "fixed" && (
                <SavingsInputRow
                  id="settings-extra-savings-fixed"
                  label="Cantidad a reservar (€)"
                  suffix="€"
                  hint="No puede superar el importe del ingreso extra."
                  value={extraSavingsFixed}
                  onChange={setExtraSavingsFixed}
                />
              )}
            </div>

            <button
              type="button"
              onClick={addExtraIncomeRow}
              disabled={addExtra.isPending}
              className="w-full rounded-lg border border-teal-500/50 bg-teal-500/15 px-3 py-2 text-sm font-semibold text-teal-200 hover:bg-teal-500/25 disabled:opacity-60"
            >
              {addExtra.isPending ? "Añadiendo…" : "Añadir ingreso extra"}
            </button>

            <ul className="space-y-2">
              {extras.length === 0 ? (
                <li className="text-sm text-slate-600">Ninguno este mes.</li>
              ) : (
                extras.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold tabular-nums text-teal-300/90">
                        {money(it.amount)}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {it.received_at} · {describeExtraSavings(it)}
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

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/60"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SavingsInputRow({
  id,
  label,
  suffix,
  hint,
  value,
  onChange,
  max,
}: {
  id: string;
  label: string;
  suffix: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  max?: number;
}) {
  const hintId = `${id}-hint`;
  return (
    <div className="mt-3">
      <label htmlFor={id} className="text-sm font-medium text-slate-400">
        {label}
      </label>
      <div className="mt-1.5 flex min-w-0 items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={hintId}
          className={INPUT_FLEX_CLASS}
        />
        <span className="shrink-0 text-slate-500">{suffix}</span>
      </div>
      <p id={hintId} className="mt-2 text-xs leading-relaxed text-slate-500">
        {hint}
      </p>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
  id,
  controls,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  id: string;
  controls: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={`min-h-11 rounded-lg px-3 py-2 font-medium transition ${
        active
          ? "bg-slate-900 text-slate-100 shadow-inner"
          : "text-slate-500 hover:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

/** Pill button used to switch savings modes. */
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
