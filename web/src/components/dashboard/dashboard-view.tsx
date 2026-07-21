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
import { MonthContextBadge } from "@/components/dashboard/month-context-badge";
import { MonthContextBanner } from "@/components/dashboard/month-context-banner";
import { MonthlyIncomeCheckFlow } from "@/components/dashboard/monthly-income-check-flow";
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
  PaginatedVariableExpenses,
  VariableExpense,
} from "@/api/types";
import { APP_SHELL_CLASS } from "@/lib/app-layout";
import { DEFAULT_FIXED_EXPENSE_ICON } from "@/components/dashboard/category-icon";
import { invalidateBudgetQueries } from "@/lib/query-keys";
import { SiteFooter } from "@/components/site-footer";
import { GuidedTour } from "@/components/guided-tour";
import { DASHBOARD_TOUR_STEPS } from "@/lib/dashboard-tour-steps";
import { useTranslation } from "react-i18next";
import {
  markDashboardTourCompleted,
} from "@/lib/guided-tour-preference";
import { maybeShowDailyNotification } from "@/lib/daily-notification";
import { hapticTick } from "@/lib/haptics";
import { useUndoableDelete } from "@/lib/use-undoable-delete";
import { getDensity } from "@/lib/density-preference";

async function loadSummary() {
  return api<Summary>("/api/summary");
}
async function loadSettings() {
  return api<Settings>("/api/settings");
}
async function loadFixed() {
  return api<FixedExpense[]>("/api/fixed-expenses");
}
/** Current-month expenses; fetches all pages (API caps limit at 200). */
async function loadExpenses() {
  const pageLimit = 200;
  const all: VariableExpense[] = [];
  let offset = 0;
  const maxPages = 100; // safety limit to prevent infinite pagination loops
  for (let i = 0; i < maxPages; i++) {
    const page = await api<PaginatedVariableExpenses>(
      `/api/expenses?limit=${pageLimit}&offset=${offset}`,
    );
    all.push(...page.items);
    if (all.length >= page.meta.total) break;
    if (page.items.length === 0) break; // edge guard: empty page → stop
    offset += pageLimit;
  }
  return all;
}
async function loadExtraIncome() {
  return api<ExtraIncome[]>("/api/extra-income");
}
async function loadCategories() {
  return api<ExpenseCategory[]>("/api/categories");
}
async function loadInsights(lang: string) {
  return api<Insights>(`/api/insights?lang=${lang}`);
}
type Props = { profileName: string };

const FIXED_LIST_PREVIEW = 3;
const VARIABLE_LIST_PREVIEW = 2;

export function Dashboard({ profileName }: Props) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastUndo, setToastUndo] = useState<{
    label: string;
    action: () => void;
  } | null>(null);
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
  const [tourClosedSignal, setTourClosedSignal] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  function returnToMenu(closePanel: () => void) {
    closePanel();
    setMenuOpen(true);
  }

  useEffect(() => {
    if (!toastMsg) return;
    const duration = toastUndo ? 5000 : 2800;
    const timer = window.setTimeout(() => {
      setToastMsg(null);
      setToastUndo(null);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [toastMsg, toastUndo]);

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
    queryKey: ["insights", i18n.language],
    queryFn: () => loadInsights(i18n.language),
  });

  useEffect(() => {
    // Wait until settings are loaded AND the dashboard has rendered
    // its key elements (summary, expenses, etc.) before starting the tour.
    // On iOS PWA, WKWebView needs more time to layout the DOM.
    if (!settingsQ.data || settingsQ.data.dashboard_tour_completed) return;
    if (summaryQ.isPending || fixedQ.isPending || expensesQ.isPending) return;

    const isIOS = typeof navigator !== "undefined" &&
      ("standalone" in navigator && (navigator as any).standalone === true);

    const delay = isIOS ? 2500 : 1500;
    const t = window.setTimeout(() => setShowTour(true), delay);
    return () => window.clearTimeout(t);
  }, [settingsQ.data, summaryQ.isPending, fixedQ.isPending, expensesQ.isPending]);

  useEffect(() => {
    if (!summaryQ.isSuccess) return;
    void maybeShowDailyNotification();
  }, [summaryQ.isSuccess]);

  function finishTour() {
    void markDashboardTourCompleted();
    setShowTour(false);
    setTourClosedSignal((n) => n + 1);
    setToastMsg(t("toasts.tourComplete"));
  }

  function skipTour() {
    void markDashboardTourCompleted();
    setShowTour(false);
    setTourClosedSignal((n) => n + 1);
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
      setToastMsg(t("toasts.fixedAdded"));
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
      hapticTick();
      setToastMsg(t("toasts.expenseRegistered"));
      void invalidateAll();
    },
    onError: (e: Error) => setToastMsg(e.message),
  });

  const expenseUndo = useUndoableDelete<VariableExpense>({
    deleteFn: (id) =>
      api(`/api/expenses/${id}`, { method: "DELETE" }),
    getItems: () => qc.getQueryData<VariableExpense[]>(["expenses"]) ?? [],
    setItems: (items) => qc.setQueryData(["expenses"], items),
    onRemoved: () => {
      setToastMsg(t("toasts.expenseDeletedUndo"));
      setToastUndo(null);
      void invalidateAll();
    },
    onRestored: () => {
      setToastMsg(null);
      setToastUndo(null);
    },
  });

  const fixedUndo = useUndoableDelete<FixedExpense>({
    deleteFn: (id) =>
      api(`/api/fixed-expenses/${id}`, { method: "DELETE" }),
    getItems: () => qc.getQueryData<FixedExpense[]>(["fixed"]) ?? [],
    setItems: (items) => qc.setQueryData(["fixed"], items),
    onRemoved: () => {
      setToastMsg(t("toasts.fixedRemovedUndo"));
      setToastUndo(null);
      void invalidateAll();
    },
    onRestored: () => {
      setToastMsg(null);
      setToastUndo(null);
    },
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
        menuOpen={menuOpen}
        onMenuOpenChange={setMenuOpen}
        onOpenSettings={() => {
          setMenuOpen(false);
          setShowSettings(true);
        }}
        onOpenCategories={() => {
          setMenuOpen(false);
          setShowCategoryManager(true);
        }}
        onOpenSavingsGoals={() => {
          setMenuOpen(false);
          setShowSavingsGoals(true);
        }}
        onExport={() => {
          setMenuOpen(false);
          void handleExport();
        }}
        onStartTour={() => {
          setMenuOpen(false);
          setShowTour(true);
        }}
        exportBusy={exportBusy}
      />

      <main
        id="main-content"
        tabIndex={-1}
        data-density={getDensity()}
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

        <MonthContextBadge referenceDate={summaryQ.data?.reference_date} />

        <MonthContextBanner referenceDate={summaryQ.data?.reference_date} />

        <DailyHero
          summary={summaryQ.data}
          summaryPending={summaryQ.isPending}
          onRefresh={() => {
            void invalidateAll().then(() => setToastMsg(t("toasts.done")));
          }}
        />

        <InsightsPanel
          data={insightsQ.data}
          isLoading={insightsQ.isPending}
          error={insightsQ.error as Error | null}
        />

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start sm:gap-5 lg:gap-6">
          <div className="min-w-0">
          <VariableExpensesSection
            referenceDate={summaryQ.data?.reference_date}
            categories={categories}
            items={variableExpenseItems}
            visibleItems={variableVisibleItems}
            isLoading={expensesQ.isPending}
            needsToggle={variableNeedsToggle}
            expanded={expandVariableList}
            hiddenCount={variableHiddenCount}
            addPending={addExpense.isPending}
            deletePending={expenseUndo.isPending}
            onSubmit={onExpenseSubmit}
            onToggleExpand={() => setExpandVariableList((v) => !v)}
            onEdit={setEditingVariable}
            onDelete={(id) => {
              expenseUndo.perform(id);
              setToastMsg(t("toasts.undoDelete"));
              setToastUndo({
                label: t("toasts.undoAction"),
                action: () => expenseUndo.undo(),
              });
            }}
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
            deletePending={fixedUndo.isPending}
            onToggleExpand={() => setExpandFixedList((v) => !v)}
            onFormIconChange={setFixedFormIcon}
            onSubmit={onFixedSubmit}
            onEdit={setEditingFixed}
            onDelete={(id) => {
              fixedUndo.perform(id);
              setToastMsg(t("toasts.undoDelete"));
              setToastUndo({
                label: t("toasts.undoAction"),
                action: () => fixedUndo.undo(),
              });
            }}
          />
          </div>
        </div>

        {insightsQ.data && insightsQ.data.category_breakdown.length > 0 && (
          <SpendingChart
            breakdown={insightsQ.data.category_breakdown}
            total={insightsQ.data.total_spent}
          />
        )}

        <MonthHistoryStrip />

        <Rule503020Panel />

        <SiteFooter />
      </main>

      {showSettings && settings && (
        <SettingsModal
          initial={settings}
          extras={extraIncomeQ.data ?? []}
          onBackToMenu={() => returnToMenu(() => setShowSettings(false))}
          onClose={() => setShowSettings(false)}
          onExtrasChanged={() => {
            setToastMsg(t("toasts.extraIncomeUpdated"));
            void invalidateAll();
          }}
          onSaved={() => {
            setShowSettings(false);
            setToastMsg(t("toasts.changesSaved"));
            void invalidateAll();
          }}
        />
      )}

      {showSavingsGoals && (
        <SavingsGoalsModal
          reservedSavings={summaryQ.data?.savings_amount}
          onBackToMenu={() => returnToMenu(() => setShowSavingsGoals(false))}
          onClose={() => setShowSavingsGoals(false)}
        />
      )}

      {showCategoryManager && (
        <CategoryManager
          categories={categories}
          onBackToMenu={() => returnToMenu(() => setShowCategoryManager(false))}
          onClose={() => setShowCategoryManager(false)}
          onChanged={() => {
            setToastMsg(t("toasts.categoriesUpdated"));
            void invalidateAll();
          }}
        />
      )}

      {editingFixed && (
        <EditFixedExpenseModal
          expense={editingFixed}
          onClose={() => setEditingFixed(null)}
          onSaved={() => {
            setToastMsg(t("toasts.fixedUpdated"));
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
            setToastMsg(t("toasts.expenseUpdated"));
            void invalidateAll();
          }}
        />
      )}

      {showTour && (
        <GuidedTour
          steps={DASHBOARD_TOUR_STEPS}
          onBackToMenu={() =>
            returnToMenu(() => {
              setShowTour(false);
              setTourClosedSignal((n) => n + 1);
            })
          }
          onComplete={finishTour}
          onSkip={skipTour}
        />
      )}

      {settings && (
        <MonthlyIncomeCheckFlow
          settings={settings}
          extras={extraIncomeQ.data ?? []}
          showTour={showTour}
          tourClosedSignal={tourClosedSignal}
          onSettingsSaved={() => {
            void invalidateAll();
          }}
          onExtrasChanged={() => void invalidateAll()}
          onToast={setToastMsg}
          onFlowComplete={() => void invalidateAll()}
        />
      )}

      <div
        className={`pointer-events-none fixed bottom-5 left-4 right-4 z-50 mx-auto max-w-md break-words rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-base text-slate-100 shadow-2xl transition-all duration-200 ${
          toastMsg ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        } ${toastUndo ? "pointer-events-auto" : ""}`}
        role="status"
        aria-live="polite"
      >
        <span>{toastMsg}</span>
        {toastUndo && (
          <>{" "}
          <button
            type="button"
            onClick={() => {
              toastUndo.action();
              setToastMsg(null);
              setToastUndo(null);
            }}
            className="font-semibold text-teal-400 underline decoration-teal-500/50 underline-offset-2 hover:text-teal-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          >
            {toastUndo.label}
          </button></>
        )}
      </div>
    </div>
  );
}
