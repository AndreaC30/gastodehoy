/**
 * Authenticated home: hero, variable/fixed lists, settings modal,
 * category selector, spending chart, and financial insights.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IoChevronDown } from "react-icons/io5";
import { type FormEvent, useEffect, useState } from "react";
import { AppBackdrop } from "@/components/app-backdrop";
import { BrandLogo } from "@/components/brand-logo";
import { SettingsModal } from "@/components/settings-modal";
import { CategoryManager } from "@/components/dashboard/category-manager";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { api } from "@/api/client";
import type {
  ExpenseCategory,
  ExtraIncome,
  FixedExpense,
  Insights,
  Settings,
  Summary,
  VariableExpense,
} from "@/api/types";
import { APP_SHELL_CLASS } from "@/lib/app-layout";
import { getCategoryIcon } from "@/components/dashboard/category-icon";
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
async function loadCategories() {
  return api<ExpenseCategory[]>("/api/categories");
}
async function loadInsights() {
  return api<Insights>("/api/insights");
}

type Props = { profileName: string };

/** Filas visibles antes del "Ver más" en cada lista. */
const FIXED_LIST_PREVIEW = 3;
const VARIABLE_LIST_PREVIEW = 2;

export function Dashboard({ profileName }: Props) {
  const qc = useQueryClient();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
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
  const categoriesQ = useQuery({
    queryKey: ["categories"],
    queryFn: loadCategories,
  });
  const insightsQ = useQuery({
    queryKey: ["insights"],
    queryFn: loadInsights,
  });

  const summaryPending = summaryQ.isPending;
  const error =
    summaryQ.error ||
    settingsQ.error ||
    fixedQ.error ||
    expensesQ.error ||
    extraIncomeQ.error ||
    categoriesQ.error ||
    insightsQ.error;

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
    mutationFn: (body: {
      amount: string;
      note: string | null;
      category_id: number | null;
    }) =>
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
  const categories = categoriesQ.data ?? [];

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
    const catId = fd.get("category_id");
    addExpense.mutate({
      amount: String(fd.get("amount") ?? ""),
      note: note || null,
      category_id: catId ? Number(catId) : null,
    });
    e.currentTarget.reset();
  }

  return (
    <div className={APP_SHELL_CLASS}>
      <AppBackdrop />
      <header className="relative z-10 border-b border-slate-800/80 px-3 py-5 sm:px-4 sm:py-7">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 lg:max-w-6xl">
          <div>
            <h1 className="m-0 leading-none">
              <BrandLogo variant="header" />
            </h1>
            <p className="mt-1.5 max-w-md text-sm text-slate-400 sm:mt-2">
              Tu margen para hoy, claro y al instante.
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[0.65rem] uppercase tracking-widest text-slate-500 sm:text-xs">
              Perfil
            </p>
            <p className="mt-0.5 text-sm font-semibold text-teal-300">
              {profileName}
            </p>
            <div className="mt-1 flex items-center gap-3 text-xs sm:justify-end">
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
                onClick={() => setShowCategoryManager(true)}
                className="font-medium text-slate-400 hover:text-teal-300"
                aria-label="Gestionar categorías"
              >
                Categorías
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

      <main className="relative z-10 mx-auto max-w-4xl space-y-4 px-3 py-5 pb-20 sm:space-y-5 sm:px-4 sm:py-6 lg:max-w-6xl">
        {error && (
          <div
            className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2.5 text-xs text-rose-200 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm"
            role="alert"
          >
            {(error as Error).message}
          </div>
        )}

        {/* ── Hero: today's spending ceiling ─────────────────────────── */}
        <section
          className="overflow-hidden rounded-xl border border-teal-500/20 bg-gradient-to-br from-slate-900/90 to-slate-900 p-4 shadow-xl shadow-black/30 sm:rounded-2xl sm:p-5 md:p-6"
          aria-live="polite"
        >
          <div className="grid gap-4 sm:gap-6 md:grid-cols-[1fr_1.35fr] md:items-stretch md:gap-8">
            <div className="flex flex-col justify-center rounded-lg border border-slate-800 bg-slate-900/80 p-4 sm:rounded-xl sm:p-5">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:text-[0.72rem]">
                Hoy puedes gastar
              </p>
              <div className="mt-1 min-h-[2.25rem] sm:min-h-[2.75rem] md:min-h-[3.5rem]">
                {summaryPending ? (
                  <div
                    className="h-8 w-36 animate-pulse rounded-lg bg-slate-700/40 sm:h-10 sm:w-44 md:h-14 md:w-52"
                    aria-hidden
                  />
                ) : (
                  <p className="text-3xl font-bold tracking-tight text-teal-400 sm:text-4xl md:text-5xl">
                    {money(summary?.suggested_spend_today)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  void invalidateAll().then(() => setToastMsg("Listo"));
                }}
                className="mt-2 w-fit text-[0.65rem] font-medium text-slate-500 underline decoration-slate-600 underline-offset-4 hover:text-slate-400 sm:mt-3 sm:text-xs"
              >
                Actualizar números
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5">
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
            "Te queda" = ingreso mensual + ingresos extra del mes − ahorro − fijos −
            gastos registrados este mes. El ahorro (% o cantidad fija) se calcula solo
            sobre el <strong className="text-slate-300">ingreso mensual</strong>; los
            extras solo aumentan el margen disponible.
          </p>
        </section>

        {/* ── Insights panel ────────────────────────────────────────── */}
        <InsightsPanel
          data={insightsQ.data}
          isLoading={insightsQ.isPending}
          error={insightsQ.error as Error | null}
        />

        {/* ── Spending chart ────────────────────────────────────────── */}
        {insightsQ.data && insightsQ.data.category_breakdown.length > 0 && (
          <SpendingChart
            breakdown={insightsQ.data.category_breakdown}
            total={insightsQ.data.total_spent}
          />
        )}

        {/* ── Variable + Fixed expense columns ──────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start sm:gap-5 lg:gap-6">
          {/* Variable expenses */}
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
                className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2"
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
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/40 sm:min-w-[100px] sm:flex-1"
                />
                <select
                  name="category_id"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/40 sm:min-w-[120px] sm:flex-1"
                  defaultValue=""
                >
                  <option value="">Sin categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <input
                  name="note"
                  type="text"
                  placeholder="Nota (opcional)"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/40 sm:min-w-[120px] sm:flex-1"
                />
                <button
                  type="submit"
                  disabled={addExpense.isPending}
                  className="w-full rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-60 sm:w-auto"
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
                    {variableVisibleItems.map((it) => {
                      const CatIcon = getCategoryIcon(it.category_icon);
                      return (
                        <li
                          key={it.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <CatIcon
                                className="h-4 w-4 shrink-0"
                                style={{ color: it.category_color ?? "#64748b" }}
                              />
                              <p className="font-semibold text-teal-300/90">
                                {money(it.amount)}
                              </p>
                            </div>
                            <p className="truncate text-sm text-slate-500">
                              {it.occurred_at}
                              {it.note ? ` · ${it.note}` : ""}
                              {it.category_name && !it.note
                                ? ` · ${it.category_name}`
                                : ""}
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
                    );
                  })}
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

          {/* Fixed expenses */}
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
                className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2"
                onSubmit={onFixedSubmit}
              >
                <input
                  name="name"
                  placeholder="Ej. Alquiler"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/40 sm:min-w-[100px] sm:flex-1"
                />
                <input
                  name="amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  placeholder="€"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/40 sm:w-24"
                />
                <button
                  type="submit"
                  disabled={addFixed.isPending}
                  className="w-full rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-60 sm:w-auto"
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

      {showCategoryManager && (
        <CategoryManager
          categories={categories}
          onClose={() => setShowCategoryManager(false)}
          onChanged={() => {
            setToastMsg("Categorías actualizadas");
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
    <IoChevronDown
      className={`h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 ${
        expanded ? "rotate-180" : ""
      }`}
      aria-hidden
    />
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
