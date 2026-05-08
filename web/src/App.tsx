/**
 * Top-level React component.
 *
 * Decides what to render based on the auth store:
 *   loading -> a "Cargando…" splash while we ask `/api/auth/me`
 *   anon    -> the LoginScreen
 *   auth    -> Authed, which routes to either the OnboardingWizard
 *              (when monthly_income is still 0) or the Dashboard.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type FormEvent,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { GravityStarsBackground } from "@/components/animate-ui/backgrounds/gravity-stars";
import { LoginScreen } from "@/components/login-screen";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { SettingsModal } from "@/components/settings-modal";
import {
  setAnonymous,
  setUser as setAuthUser,
  snapshot,
  subscribe,
} from "@/auth";
import { api } from "./api/client";
import type {
  FixedExpense,
  Settings,
  Summary,
  User,
  VariableExpense,
} from "./api/types";
import { money, savingsLabel } from "./lib/format";

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

const Background = (
  <GravityStarsBackground
    className="pointer-events-none fixed inset-0 z-0 min-h-screen"
    starsCount={70}
    glowIntensity={13}
    starsOpacity={0.5}
    movementSpeed={0.25}
  />
);

/** Best-effort logout: hit the API and switch the local auth state. */
async function logout() {
  try {
    await api<void>("/api/auth/logout", { method: "POST" });
  } catch {
    /* ignore */
  } finally {
    setAnonymous();
  }
}

/** Root component. See module header for the rendering decision tree. */
export default function App() {
  const auth = useSyncExternalStore(subscribe, snapshot);

  useEffect(() => {
    if (auth.status !== "loading") return;
    let alive = true;
    (async () => {
      try {
        const u = await api<User>("/api/auth/me");
        if (alive) setAuthUser(u);
      } catch {
        if (alive) setAnonymous();
      }
    })();
    return () => {
      alive = false;
    };
  }, [auth.status]);

  if (auth.status === "loading") {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
        {Background}
        <div className="relative z-10 flex min-h-screen items-center justify-center text-sm text-slate-500">
          Cargando…
        </div>
      </div>
    );
  }

  if (auth.status === "anon" || !auth.user) {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-slate-950 bg-[radial-gradient(ellipse_900px_500px_at_50%_-20%,rgba(94,234,212,0.12),transparent_55%)] text-slate-100">
        {Background}
        <LoginScreen />
      </div>
    );
  }

  return <Authed userName={auth.user.name} />;
}

/**
 * Authenticated shell. Reads settings once and routes to the wizard or
 * the dashboard depending on whether the user has set their income.
 */
function Authed({ userName }: { userName: string }) {
  const settingsQ = useQuery({ queryKey: ["settings"], queryFn: loadSettings });
  // Skip explícito por si el usuario aún no tiene ingreso pero quiere mirar la app.
  const [skipped, setSkipped] = useState(false);
  const qc = useQueryClient();

  if (settingsQ.isPending) {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
        {Background}
        <div className="relative z-10 flex min-h-screen items-center justify-center text-sm text-slate-500">
          Cargando…
        </div>
      </div>
    );
  }

  const needsOnboarding =
    !skipped &&
    settingsQ.data != null &&
    Number(settingsQ.data.monthly_income) <= 0;

  if (needsOnboarding) {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-slate-950 bg-[radial-gradient(ellipse_900px_500px_at_50%_-20%,rgba(94,234,212,0.12),transparent_55%)] text-slate-100">
        {Background}
        <OnboardingWizard
          userName={userName}
          onSkip={() => setSkipped(true)}
          onDone={() => {
            void qc.invalidateQueries();
            setSkipped(false);
          }}
        />
      </div>
    );
  }

  return <Dashboard profileName={userName} />;
}

/**
 * Main app screen. Shows the daily budget hero plus lists of fixed and
 * variable expenses with their CRUD forms; settings are accessible
 * through the gear button in the header.
 */
function Dashboard({ profileName }: { profileName: string }) {
  const qc = useQueryClient();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 2800);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  const summaryQ = useQuery({ queryKey: ["summary"], queryFn: loadSummary });
  const settingsQ = useQuery({ queryKey: ["settings"], queryFn: loadSettings });
  const fixedQ = useQuery({ queryKey: ["fixed"], queryFn: loadFixed });
  const expensesQ = useQuery({ queryKey: ["expenses"], queryFn: loadExpenses });

  const loading =
    summaryQ.isPending ||
    settingsQ.isPending ||
    fixedQ.isPending ||
    expensesQ.isPending;
  const error =
    summaryQ.error || settingsQ.error || fixedQ.error || expensesQ.error;

  const invalidateAll = () =>
    qc.invalidateQueries({
      predicate: (q) =>
        ["summary", "settings", "fixed", "expenses"].includes(
          q.queryKey[0] as string,
        ),
    });

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
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 bg-[radial-gradient(ellipse_900px_500px_at_50%_-20%,rgba(94,234,212,0.12),transparent_55%)] text-slate-100">
      {Background}
      <header className="relative z-10 border-b border-slate-800/80 px-4 py-7">
        <div className="mx-auto flex max-w-4xl items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Gasto<span className="font-semibold text-slate-500">De</span>Hoy
            </h1>
            <p className="mt-1 max-w-md text-slate-400">
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
                className="font-medium text-slate-400 hover:text-teal-300"
              >
                ⚙ Ajustes
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

      <main className="relative z-10 mx-auto max-w-4xl space-y-5 px-4 py-6 pb-20">
        {error && (
          <div
            className="rounded-2xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-200"
            role="alert"
          >
            {(error as Error).message}
          </div>
        )}

        {/* Hero */}
        <section
          className="overflow-hidden rounded-2xl border border-teal-500/20 bg-gradient-to-br from-slate-900/90 to-slate-900 p-5 shadow-xl shadow-black/30 md:p-6"
          aria-live="polite"
        >
          <div className="grid gap-6 md:grid-cols-[1fr_1.35fr] md:items-stretch md:gap-8">
            <div className="flex flex-col justify-center rounded-xl border border-slate-800 bg-slate-900/80 p-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Hoy puedes gastar
              </p>
              <p className="mt-1 text-4xl font-bold tracking-tight text-teal-400 md:text-5xl">
                {loading ? "…" : money(summary?.suggested_spend_today)}
              </p>
              <button
                type="button"
                onClick={() => {
                  void invalidateAll().then(() => setToastMsg("Listo"));
                }}
                className="mt-3 w-fit text-sm font-semibold text-sky-400 underline decoration-sky-400/50 underline-offset-4 hover:text-teal-300"
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
            “Te queda” = ingreso − ahorro − fijos − gastos registrados este mes. El
            ahorro <strong className="text-slate-300">ya está descontado</strong>.
          </p>
        </section>

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
              Cada registro actualiza cuánto te queda y tu techo diario. Lo recurrente
              va en <strong className="text-slate-400">Gastos fijos</strong> (más abajo).
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
            <ul className="space-y-2">
              {(expensesQ.data ?? []).map((it) => (
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
            <ul className="mt-4 space-y-2">
              {(fixedQ.data ?? []).map((it) => (
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
          </div>
        </section>

        <footer className="rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-3 text-sm text-slate-500">
          <p className="text-[0.72rem] font-semibold uppercase tracking-widest text-slate-600">
            Fórmula
          </p>
          <p className="mt-1 font-mono text-xs leading-relaxed text-slate-500">
            (ingreso − ahorro − fijos − gastos del mes) ÷ días que quedan
          </p>
        </footer>
      </main>

      {showSettings && settings && (
        <SettingsModal
          initial={settings}
          onClose={() => setShowSettings(false)}
          onSaved={() => {
            setShowSettings(false);
            setToastMsg("Ajustes guardados");
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

/** Compact metric tile used inside the dashboard hero grid. */
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
