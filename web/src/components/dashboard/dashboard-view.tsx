/**
 * Authenticated home: hero, variable/fixed lists, settings modal,
 * category selector, spending chart, and financial insights.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { AppBackdrop } from "@/components/app-backdrop";
import { SettingsModal } from "@/components/settings-modal";
import { CategoryManager } from "@/components/dashboard/category-manager";
import { DailyHero } from "@/components/dashboard/daily-hero";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EditFixedExpenseModal } from "@/components/dashboard/edit-fixed-expense-modal";
import { EditVariableExpenseModal } from "@/components/dashboard/edit-variable-expense-modal";
import { FixedExpensesSection } from "@/components/dashboard/fixed-expenses-section";
import { VariableExpensesSection } from "@/components/dashboard/variable-expenses-section";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { MonthHistoryStrip } from "@/components/dashboard/month-history-strip";
import { Rule503020Panel } from "@/components/dashboard/rule-503020-panel";
import { SavingsGoalsModal } from "@/components/savings-goals-modal";
import { api, downloadCsv } from "@/api/client";
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
import { DEFAULT_FIXED_EXPENSE_ICON } from "@/components/dashboard/category-icon";
import { invalidateBudgetQueries } from "@/lib/query-keys";
import { SiteFooter } from "@/components/site-footer";
import { GuidedTour } from "@/components/guided-tour";
import { DASHBOARD_TOUR_STEPS } from "@/lib/dashboard-tour-steps";
import {
  hasCompletedDashboardTour,
  markDashboardTourCompleted,
} from "@/lib/guided-tour-preference";

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

const FIXED_LIST_PREVIEW = 3;
const VARIABLE_LIST_PREVIEW = 2;

export function Dashboard({ profileName }: Props) {
  const qc = useQueryClient();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showSavingsGoals, setShowSavingsGoals] = useState(false);
  const [expandFixedList, setExpandFixedList] = useState(false);
  const [expandVariableList, setExpandVariableList] = useState(false);
  const [fixedFormIcon, setFixedFormIcon] = useState(DEFAULT_FIXED_EXPENSE_ICON);
  const [editingFixed, setEditingFixed] = useState<FixedExpense | null>(null);
  const [editingVariable, setEditingVariable] = useState<VariableExpense | null>(
    null,
  );
  const [exportBusy, setExportBusy] = useState(false);
  const [showTour, setShowTour] = useState(false);

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

  useEffect(() => {
    if (!settingsQ.data || hasCompletedDashboardTour()) return;
    const t = window.setTimeout(() => setShowTour(true), 1500);
    return () => window.clearTimeout(t);
  }, [settingsQ.data]);

  function finishTour() {
    markDashboardTourCompleted();
    setShowTour(false);
    setToastMsg("Guía completada. Puedes volver a verla desde el menú.");
  }

  function skipTour() {
    markDashboardTourCompleted();
    setShowTour(false);
  }

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
    mutationFn: (body: { name: string; amount: string; icon: string }) =>
      api<FixedExpense>("/api/fixed-expenses", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      setFixedFormIcon(DEFAULT_FIXED_EXPENSE_ICON);
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
      icon: fixedFormIcon,
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

  async function handleExport() {
    setExportBusy(true);
    try {
      const now = new Date();
      const filename = `gastodehoy-export-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.csv`;
      await downloadCsv("/api/export/csv", filename);
      setToastMsg("CSV descargado");
    } catch (e) {
      setToastMsg((e as Error).message);
    } finally {
      setExportBusy(false);
    }
  }

  return (
    <div className={APP_SHELL_CLASS}>
      <AppBackdrop />
      <DashboardHeader
        profileName={profileName}
        settingsReady={!!settingsQ.data}
        onOpenSettings={() => setShowSettings(true)}
        onOpenCategories={() => setShowCategoryManager(true)}
        onOpenSavingsGoals={() => setShowSavingsGoals(true)}
        onExport={() => void handleExport()}
        onStartTour={() => {
          setShowTour(true);
        }}
        exportBusy={exportBusy}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="relative z-10 mx-auto max-w-4xl space-y-4 px-3 py-5 pb-20 sm:space-y-5 sm:px-4 sm:py-6 lg:max-w-6xl"
      >
        {error && (
          <div
            className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2.5 text-xs text-rose-200 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm"
            role="alert"
          >
            {(error as Error).message}
          </div>
        )}

        <DailyHero
          summary={summaryQ.data}
          summaryPending={summaryQ.isPending}
          onRefresh={() => {
            void invalidateAll().then(() => setToastMsg("Listo"));
          }}
        />

        <InsightsPanel
          data={insightsQ.data}
          isLoading={insightsQ.isPending}
          error={insightsQ.error as Error | null}
        />

        {insightsQ.data && insightsQ.data.category_breakdown.length > 0 && (
          <SpendingChart
            breakdown={insightsQ.data.category_breakdown}
            total={insightsQ.data.total_spent}
          />
        )}

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start sm:gap-5 lg:gap-6">
          <div className="min-w-0">
          <VariableExpensesSection
            categories={categories}
            items={variableExpenseItems}
            visibleItems={variableVisibleItems}
            isLoading={expensesQ.isPending}
            needsToggle={variableNeedsToggle}
            expanded={expandVariableList}
            hiddenCount={variableHiddenCount}
            addPending={addExpense.isPending}
            deletePending={delExpense.isPending}
            onSubmit={onExpenseSubmit}
            onToggleExpand={() => setExpandVariableList((v) => !v)}
            onEdit={setEditingVariable}
            onDelete={(id) => delExpense.mutate(id)}
          />
          </div>
          <div className="min-w-0">
          <FixedExpensesSection
            items={fixedItems}
            visibleItems={fixedVisibleItems}
            isLoading={fixedQ.isPending}
            needsToggle={fixedNeedsToggle}
            expanded={expandFixedList}
            hiddenCount={fixedHiddenCount}
            formIcon={fixedFormIcon}
            pending={addFixed.isPending}
            deletePending={delFixed.isPending}
            onToggleExpand={() => setExpandFixedList((v) => !v)}
            onFormIconChange={setFixedFormIcon}
            onSubmit={onFixedSubmit}
            onEdit={setEditingFixed}
            onDelete={(id) => delFixed.mutate(id)}
          />
          </div>
        </div>

        <MonthHistoryStrip />

        <Rule503020Panel />

        <SiteFooter />
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

      {showSavingsGoals && (
        <SavingsGoalsModal
          reservedSavings={summaryQ.data?.savings_amount}
          onClose={() => setShowSavingsGoals(false)}
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

      {editingFixed && (
        <EditFixedExpenseModal
          expense={editingFixed}
          onClose={() => setEditingFixed(null)}
          onSaved={() => {
            setToastMsg("Gasto fijo actualizado");
            void invalidateAll();
          }}
        />
      )}

      {editingVariable && (
        <EditVariableExpenseModal
          expense={editingVariable}
          categories={categories}
          onClose={() => setEditingVariable(null)}
          onSaved={() => {
            setToastMsg("Gasto actualizado");
            void invalidateAll();
          }}
        />
      )}

      {showTour && (
        <GuidedTour
          steps={DASHBOARD_TOUR_STEPS}
          onComplete={finishTour}
          onSkip={skipTour}
        />
      )}

      <div
        className={`pointer-events-none fixed bottom-5 left-4 right-4 z-50 mx-auto max-w-md break-words rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-base text-slate-100 shadow-2xl transition-all duration-200 ${
          toastMsg ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
        role="status"
        aria-live="polite"
      >
        {toastMsg}
      </div>
    </div>
  );
}
