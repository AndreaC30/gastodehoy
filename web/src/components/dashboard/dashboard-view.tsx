/**
 * Authenticated home: hero, variable/fixed lists, settings modal.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { AppBackdrop } from "@/components/app-backdrop";
import { BrandLogo } from "@/components/brand-logo";
import { SettingsModal } from "@/components/settings-modal";
import { api } from "@/api/client";
import type {
  ExtraIncome,
  FixedExpense,
  Settings,
  Summary,
  VariableExpense,
} from "@/api/types";
import { APP_SHELL_CLASS } from "@/lib/app-layout";
import { money, savingsLabel } from "@/lib/format";
import { invalidateBudgetQueries } from "@/lib/query-keys";
import { logout } from "@/lib/session";

async function loadSummary() {
  return api<Summary>("/api/summary");
}
async function loadSettings() {
  return api<Settings>("/api/settings");
}
async function loadFixed() {
  return api<FixedExpense[]>("/api/fixed-expenses");
}
async function loadExpenses() {
  return api<VariableExpense[]>("/api/expenses");
}
async function loadExtraIncome() {
  return api<ExtraIncome[]>("/api/extra-income");
}

type Props = { profileName: string };

/** Filas visibles antes del “Ver más” en cada lista. */
const FIXED_LIST_PREVIEW = 3;
const VARIABLE_LIST_PREVIEW = 2;

export function Dashboard({ profileName }: Props) {
  const qc = useQueryClient();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [expandFixedList, setExpandFixedList] = useState(false);
  const [expandVariableList, setExpandVariableList] = useState(false);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 2800);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  const summaryQ = useQuery({ queryKey: ["summary"], queryFn: loadSummary });
  const settingsQ = useQuery({ queryKey: ["settings"], queryFn: loadSettings });
  const fixedQ = useQuery({ queryKey: ["fixed"], queryFn: loadFixed });
  const expensesQ = useQuery({ queryKey: ["expenses"], queryFn: loadExpenses });
  const extraIncomeQ = useQuery({
    queryKey: ["extra-income"],
    queryFn: loadExtraIncome,
  });

  const summaryPending = summaryQ.isPending;
  const error =
    summaryQ.error ||
    settingsQ.error ||
    fixedQ.error ||
    expensesQ.error ||
    extraIncomeQ.error;

  const invalidateAll = () => invalidateBudgetQueries(qc);

  const addFixed = useMutation({
    mutationFn: (body: { name: string; amount: string }) =>
      api<FixedExpense>("/api/fixed-expenses", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      setToastMsg("Gasto fijo añadido");
      void invalidateAll();
    },
    onError: (e: Error) => setToastMsg(e.message),
  });

  const addExpense = useMutation({
    mutationFn: (body: { amount: string; note: string | null }) =>
      api<VariableExpense>("/api/expenses", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      setToastMsg("Gasto registrado");
      void invalidateAll();
    },
    onError: (e: Error) => setToastMsg(e.message),
  });

  const delFixed = useMutation({
    mutationFn: (id: number) =>
      api(`/api/fixed-expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setToastMsg("Gasto fijo quitado");
      void invalidateAll();
    },
    onError: (e: Error) => setToastMsg(e.message),
  });

  const delExpense = useMutation({
    mutationFn: (id: number) =>
      api(`/api/expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setToastMsg("Gasto borrado");
      void invalidateAll();
    },
    onError: (e: Error) => setToastMsg(e.message),
  });

  const summary = summaryQ.data;
  const settings = settingsQ.data;

  const variableExpenseItems = expensesQ.data ?? [];
  const variableNeedsToggle =
    variableExpenseItems.length > VARIABLE_LIST_PREVIEW;
  const variableVisibleItems =
    variableNeedsToggle && !expandVariableList
      ? variableExpenseItems.slice(0, VARIABLE_LIST_PREVIEW)
      : variableExpenseItems;
  const variableHiddenCount =
    variableExpenseItems.length - VARIABLE_LIST_PREVIEW;

  const fixedItems = fixedQ.data ?? [];
  const fixedNeedsToggle = fixedItems.length > FIXED_LIST_PREVIEW;
  const fixedVisibleItems =
    fixedNeedsToggle && !expandFixedList
      ? fixedItems.slice(0, FIXED_LIST_PREVIEW)
      : fixedItems;
  const fixedHiddenCount = fixedItems.length - FIXED_LIST_PREVIEW;

  function onFixedSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    addFixed.mutate({
      name: String(fd.get("name") ?? ""),
      amount: String(fd.get("amount") ?? ""),
    });
    e.currentTarget.reset();
  }

  function onExpenseSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const note = String(fd.get("note") ?? "").trim();
    addExpense.mutate({
      amount: String(fd.get("amount") ?? ""),
      note: note || null,
    });
    e.currentTarget.reset();
  }

  return (
    <div className={APP_SHELL_CLASS}>
      <AppBackdrop />
      <header className="relative z-10 border-b border-slate-800/80 px-4 py-7">
        <div className="mx-auto flex max-w-4xl items-start justify-between gap-4 lg:max-w-6xl">
          <div>
            <h1 className="m-0 leading-none">
              <BrandLogo variant="header" />
            </h1>
            <p className="mt-2 max-w-md text-slate-400">
              Tu margen para hoy, claro y al instante.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-slate-500">
              Perfil
            </p>
            <p className="mt-0.5 text-sm font-semibold text-teal-300">
              {profileName}
            </p>
            <div className="mt-1 flex items-center justify-end gap-3 text-xs">
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                disabled={!settingsQ.data}
                className="font-medium text-slate-400 hover:text-teal-300 disabled:opacity-40"
                aria-label="Configura tus ingresos"
              >
                Tus ingresos
              </button>
              <button
                type="button"
                onClick={() => void logout()}
                className="font-medium text-slate-500 underline decoration-slate-700 underline-offset-4 hover:text-slate-300"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl space-y-5 px-4 py-6 pb-20 lg:max-w-6xl">
        {error && (
          <div
            className="rounded-2xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-200"
            role="alert"
          >
            {(error as Error).message}
          </div>
        )}

        <section
          className="overflow-hidden rounded-2xl border border-teal-500/20 bg-gradient-to-br from-slate-900/90 to-slate-900 p-5 shadow-xl shadow-black/30 md:p-6"
          aria-live="polite"
        >
          <div className="grid gap-6 md:grid-cols-[1fr_1.35fr] md:items-stretch md:gap-8">
            <div className="flex flex-col justify-center rounded-xl border border-slate-800 bg-slate-900/80 p-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Hoy puedes gastar
              </p>
              <div className="mt-1 min-h-[2.75rem] md:min-h-[3.5rem]">
                {summaryPending ? (
                  <div
                    className="h-10 w-44 animate-pulse rounded-lg bg-slate-700/40 md:h-14 md:w-52"
                    aria-hidden
                  />
                ) : (
                  <p className="text-4xl font-bold tracking-tight text-teal-400 md:text-5xl">
                    {money(summary?.suggested_spend_today)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  void invalidateAll().then(() => setToastMsg("Listo"));
                }}
                className="mt-3 w-fit text-xs font-medium text-slate-500 underline decoration-slate-600 underline-offset-4 hover:text-slate-400"
              >
                Actualizar números
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <Metric
                label="Ahorro reservado"
                value={
                  summary
                    ? savingsLabel(
                        summary.savings_amount,
                        summary.savings_percent,
                        summary.savings_mode,
                      )
                    : "—"
                }
              />
              <Metric
                label="Gastos fijos"
                value={money(summary?.fixed_expenses_total)}
              />
              <Metric
                label="Gastado este mes"
                value={money(summary?.variable_spent_month)}
              />
              <Metric
                label="Ingresos extra (mes)"
                value={money(summary?.extra_income_month)}
              />
              <Metric
                label="Te queda este mes"
                value={money(summary?.remaining_this_month)}
                highlight
              />
              <Metric
                label="Días que quedan"
                value={
                  summary?.days_remaining_in_month != null
                    ? String(summary.days_remaining_in_month)
                    : "—"
                }
              />
            </div>
          </div>
          <p className="mt-5 border-t border-slate-800 pt-4 text-sm leading-relaxed text-slate-500">
            “Te queda” = ingreso mensual + ingresos extra del mes − ahorro − fijos −
            gastos registrados este mes. El ahorro (% o cantidad fija) se calcula solo
            sobre el <strong className="text-slate-300">ingreso mensual</strong>; los
            extras solo aumentan el margen disponible.
          </p>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start lg:gap-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 shadow-lg shadow-black/20">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="text-lg font-bold tracking-tight">
              Gastos del día a día
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Suma aquí compras y gastos sueltos del mes
            </p>
          </div>
          <div className="p-5">
            <p className="mb-4 text-sm leading-relaxed text-slate-500">
              Cada registro actualiza cuánto te queda y tu techo diario. Para gastos que
              se repiten cada mes, usa <strong className="text-slate-400">Gastos fijos</strong>
              <span className="hidden lg:inline"> (columna de la derecha)</span>
              <span className="lg:hidden"> (bloque siguiente)</span>.
            </p>
            <form
              className="flex flex-wrap gap-2"
              onSubmit={onExpenseSubmit}
            >
              <input
                name="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                placeholder="Cantidad (€)"
                required
                className="min-w-[140px] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/40"
              />
              <input
                name="note"
                type="text"
                placeholder="Nota (opcional)"
                className="min-w-[160px] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/40"
              />
              <button
                type="submit"
                disabled={addExpense.isPending}
                className="rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-60"
              >
                Registrar
              </button>
            </form>
            <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Este mes
            </h3>
            {expensesQ.isPending ? (
              <p className="text-sm text-slate-500">Cargando gastos…</p>
            ) : (
              <>
                <ul className="space-y-2">
                  {variableVisibleItems.map((it) => (
                    <li
                      key={it.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2.5"
                    >
                      <div>
                        <p className="font-semibold text-teal-300/90">
                          {money(it.amount)}
                        </p>
                        <p className="text-sm text-slate-500">
                          {it.occurred_at}
                          {it.note ? ` · ${it.note}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => delExpense.mutate(it.id)}
                        disabled={delExpense.isPending}
                        className="shrink-0 rounded-lg border border-rose-500/40 px-2.5 py-1 text-sm font-medium text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"
                      >
                        Borrar
                      </button>
                    </li>
                  ))}
                </ul>
                {variableNeedsToggle && (
                  <button
                    type="button"
                    onClick={() => setExpandVariableList((v) => !v)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700/90 bg-slate-950/40 px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                    aria-expanded={expandVariableList}
                  >
                    <ChevronInCircle expanded={expandVariableList} />
                    {expandVariableList
                      ? "Mostrar menos"
                      : `Ver ${variableHiddenCount} gasto${variableHiddenCount === 1 ? "" : "s"} más del mes`}
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 shadow-lg shadow-black/20">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="text-lg font-bold tracking-tight">Gastos fijos</h2>
            <p className="mt-1 text-sm text-slate-500">
              Lo que pagas igual cada mes
            </p>
          </div>
          <div className="p-5">
            <p className="mb-4 text-sm text-slate-500">
              Vivienda, seguros, suscripciones… suman aquí.
            </p>
            <form
              className="flex flex-wrap gap-2"
              onSubmit={onFixedSubmit}
            >
              <input
                name="name"
                placeholder="Ej. Alquiler"
                required
                className="min-w-[120px] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/40"
              />
              <input
                name="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                placeholder="€"
                required
                className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/40"
              />
              <button
                type="submit"
                disabled={addFixed.isPending}
                className="rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-60"
              >
                Añadir
              </button>
            </form>
            {fixedQ.isPending ? (
              <p className="mt-4 text-sm text-slate-500">Cargando gastos fijos…</p>
            ) : (
              <>
                <ul className="mt-4 space-y-2">
                  {fixedVisibleItems.map((it) => (
                    <li
                      key={it.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2.5"
                    >
                      <div>
                        <p className="font-semibold text-slate-200">{it.name}</p>
                        <p className="text-sm text-slate-500">{money(it.amount)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => delFixed.mutate(it.id)}
                        disabled={delFixed.isPending}
                        className="shrink-0 rounded-lg border border-rose-500/40 px-2.5 py-1 text-sm font-medium text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
                {fixedNeedsToggle && (
                  <button
                    type="button"
                    onClick={() => setExpandFixedList((v) => !v)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700/90 bg-slate-950/40 px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                    aria-expanded={expandFixedList}
                  >
                    <ChevronInCircle expanded={expandFixedList} />
                    {expandFixedList
                      ? "Mostrar menos"
                      : `Ver ${fixedHiddenCount} gasto${fixedHiddenCount === 1 ? "" : "s"} fijo${fixedHiddenCount === 1 ? "" : "s"} más`}
                  </button>
                )}
              </>
            )}
          </div>
        </section>
        </div>

        <footer className="rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-3 text-sm text-slate-500">
          <p className="text-[0.72rem] font-semibold uppercase tracking-widest text-slate-600">
            Fórmula
          </p>
          <p className="mt-1 font-mono text-xs leading-relaxed text-slate-500">
            (ingreso + extras del mes − ahorro − fijos − gastos del mes) ÷ días que
            quedan
          </p>
        </footer>
      </main>

      {showSettings && settings && (
        <SettingsModal
          initial={settings}
          extras={extraIncomeQ.data ?? []}
          onClose={() => setShowSettings(false)}
          onExtrasChanged={() => {
            setToastMsg("Ingresos extra actualizados");
            void invalidateAll();
          }}
          onSaved={() => {
            setShowSettings(false);
            setToastMsg("Cambios guardados");
            void invalidateAll();
          }}
        />
      )}

      <div
        className={`pointer-events-none fixed bottom-5 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-sm text-slate-100 shadow-2xl transition-all duration-200 ${
          toastMsg
            ? "translate-y-0 opacity-100"
            : "translate-y-2 opacity-0"
        }`}
        role="status"
        aria-live="polite"
      >
        {toastMsg}
      </div>
    </div>
  );
}

/** Flecha para expandir/colapsar listas largas (gira al expandir). */
function ChevronInCircle({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 ${
        expanded ? "rotate-180" : ""
      }`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-3 ${
        highlight
          ? "border-teal-500/35 bg-teal-500/10"
          : "border-slate-800 bg-slate-900/90"
      }`}
    >
      <p className="text-[0.65rem] font-semibold uppercase leading-tight tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1.5 break-words text-sm font-bold leading-snug ${
          highlight ? "text-teal-300" : "text-slate-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
