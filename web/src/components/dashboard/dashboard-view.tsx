/**
 * Authenticated home: hero, variable/fixed lists, settings modal,
 * category selector, spending chart, and financial insights.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { AppBackdrop } from "@/components/app-backdrop";
import { DailyHero } from "@/components/dashboard/daily-hero";
import { Sidebar } from "@/components/dashboard/sidebar-nav";
import { IncomeSettingsSection } from "@/components/dashboard/income-settings-section";
import { CategoriesSection } from "@/components/dashboard/categories-section";
import { SavingsGoalsSection } from "@/components/dashboard/savings-goals-section";
import { AccountSection } from "@/components/dashboard/account-section";
import { TourSection } from "@/components/dashboard/tour-section";
import { BrandLogo } from "@/components/brand-logo";
import { BottomNav } from "@/components/ui/bottom-nav";
import { IoMenu } from "react-icons/io5";
import { FOCUS_RING, ICON_BTN } from "@/lib/ui-a11y";
import { EditFixedExpenseModal } from "@/components/dashboard/edit-fixed-expense-modal";
import { EditVariableExpenseModal } from "@/components/dashboard/edit-variable-expense-modal";
import { FixedExpensesSection } from "@/components/dashboard/fixed-expenses-section";
import { VariableExpensesSection } from "@/components/dashboard/variable-expenses-section";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { MonthHistoryStrip } from "@/components/dashboard/month-history-strip";
import { MonthContextBadge } from "@/components/dashboard/month-context-badge";
import { MonthContextBanner } from "@/components/dashboard/month-context-banner";
import {
  budgetReferenceDate,
  capitalizeFirstLetter,
  formatMonthYear,
} from "@/lib/month-context";
import { MonthlyIncomeCheckFlow } from "@/components/dashboard/monthly-income-check-flow";
import { Rule503020Panel } from "@/components/dashboard/rule-503020-panel";
import { GuidedTour } from "@/components/guided-tour";
import { DASHBOARD_TOUR_STEPS } from "@/lib/dashboard-tour-steps";
import {
  markDashboardTourCompleted,
} from "@/lib/guided-tour-preference";
import { maybeShowDailyNotification } from "@/lib/daily-notification";
import { hapticTick } from "@/lib/haptics";
import { useUndoableDelete } from "@/lib/use-undoable-delete";
import { getDensity, subscribeDensity } from "@/lib/density-preference";
import type { DashboardSection } from "@/lib/dashboard-state";
import { getActiveSection, setActiveSection } from "@/lib/dashboard-state";
import { invalidateBudgetQueries } from "@/lib/query-keys";
import { SiteFooter } from "@/components/site-footer";
import { DASHBOARD_SCROLL_CLASS } from "@/lib/app-layout";
import { DEFAULT_FIXED_EXPENSE_ICON } from "@/components/dashboard/category-icon";
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

type GastosTab = "variables" | "fijos";

const SECTION_TITLE_KEY: Record<DashboardSection, string> = {
  hoy: "header.sectionHoy",
  gastos: "header.sectionGastos",
  analisis: "header.sectionAnalisis",
  historico: "header.sectionHistorico",
  ingresos: "header.sectionIngresos",
  categorias: "header.sectionCategorias",
  metas: "header.sectionMetas",
  tour: "header.sectionTour",
  cuenta: "header.sectionCuenta",
};

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [gastosTab, setGastosTab] = useState<GastosTab>("variables");
  const density = useSyncExternalStore(
    subscribeDensity,
    getDensity,
    () => "comfortable" as const,
  );

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
    const t = window.setTimeout(() => {
      setActiveSectionState("hoy");
      setActiveSection("hoy");
      setShowTour(true);
    }, delay);
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

  // Active section state
  const [activeSection, setActiveSectionState] = useState<DashboardSection>(() => getActiveSection());

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
      setToastMsg(t("toasts.csvDownloaded"));
    } catch (e) {
      setToastMsg((e as Error).message);
    } finally {
      setExportBusy(false);
    }
  }

  const handleSectionChange = useCallback((section: DashboardSection) => {
    hapticTick();
    setActiveSectionState(section);
    setActiveSection(section);
  }, []);

  const goToAddExpense = useCallback(() => {
    setGastosTab("variables");
    handleSectionChange("gastos");
    window.setTimeout(() => {
      document.getElementById("add-expense")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  }, [handleSectionChange]);

  const ensureTourSection = useCallback(
    (section: NonNullable<(typeof DASHBOARD_TOUR_STEPS)[number]["section"]>) => {
      handleSectionChange(section);
    },
    [handleSectionChange],
  );

  function startGuidedTour() {
    handleSectionChange("hoy");
    // Let the «hoy» section mount before the overlay measures targets.
    window.setTimeout(() => setShowTour(true), 100);
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <Sidebar
        profileName={profileName}
        exportBusy={exportBusy}
        onExport={() => void handleExport()}
        onSectionChange={handleSectionChange}
        activeSection={activeSection}
        mobileOpen={mobileMenuOpen}
        onMobileOpenChange={setMobileMenuOpen}
      />

      <div className={DASHBOARD_SCROLL_CLASS}>
        <AppBackdrop />

        <header className="relative z-10 border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2.5 sm:px-4 sm:py-3.5">
          <div className="mx-auto flex max-w-lg items-center gap-2 sm:gap-3 md:max-w-4xl lg:max-w-6xl">
            {/* Mobile: menu left + brand (section as subtitle, like desktop tagline) */}
            <button
              type="button"
              data-tour="menu"
              onClick={() => setMobileMenuOpen(true)}
              className={`${ICON_BTN} shrink-0 md:hidden`}
              aria-label={t("header.menu")}
              aria-expanded={mobileMenuOpen}
              aria-haspopup="dialog"
            >
              <IoMenu className="gdh-icon-lg" aria-hidden />
            </button>
            <div className="min-w-0 flex-1 md:hidden">
              <h1 className="m-0 leading-none">
                <BrandLogo variant="header" />
              </h1>
              <p className="mt-0.5 truncate text-sm font-medium text-[var(--color-text-muted)]">
                {t(SECTION_TITLE_KEY[activeSection])}
              </p>
            </div>

            {/* Desktop: brand + tagline */}
            <div className="hidden min-w-0 flex-1 md:block">
              <h1 className="m-0 leading-none">
                <BrandLogo variant="header" />
              </h1>
              <p className="mt-1 max-w-md truncate text-sm text-[var(--color-text-muted)] sm:text-[13px]">
                {t("header.tagline")}
              </p>
            </div>
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          data-density={density}
          className="relative z-10 mx-auto w-full max-w-lg flex-1 space-y-8 px-4 py-6 pb-[8.5rem] sm:space-y-7 sm:px-4 sm:py-6 md:max-w-4xl md:space-y-6 md:pb-20 lg:max-w-6xl"
        >
        {error && (
          <div
            className="rounded-xl border border-[var(--color-crit-border)] bg-[var(--color-crit-dim)] px-3 py-2.5 text-xs text-[var(--color-crit)] sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm"
            role="alert"
          >
            {(error as Error).message}
          </div>
        )}

        <div
          key={activeSection}
          style={{ animation: "gdhSectionIn 180ms ease-out" }}
        >
        {/* Section: HOY */}
        {activeSection === 'hoy' && (
          <div className="space-y-5 md:space-y-4">
            <div className="hidden md:block">
              <MonthContextBadge referenceDate={summaryQ.data?.reference_date} />
            </div>
            <MonthContextBanner referenceDate={summaryQ.data?.reference_date} />
            <DailyHero
              summary={summaryQ.data}
              summaryPending={summaryQ.isPending}
              monthLabel={capitalizeFirstLetter(
                formatMonthYear(
                  budgetReferenceDate(summaryQ.data?.reference_date),
                  i18n.language,
                ),
              )}
              onRefresh={() => {
                void invalidateAll().then(() => setToastMsg(t("toasts.done")));
              }}
              onAddExpense={goToAddExpense}
            />
          </div>
        )}

        {/* Section: GASTOS */}
        {activeSection === 'gastos' && (
          <>
            <div
              className="flex rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-1 md:hidden"
              role="tablist"
              aria-label={t("header.sectionGastos")}
            >
              {([
                { id: "variables" as const, label: t("nav.gastosVariables") },
                { id: "fijos" as const, label: t("nav.gastosFijos") },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={gastosTab === tab.id}
                  onClick={() => {
                    hapticTick();
                    setGastosTab(tab.id);
                  }}
                  className={`min-h-11 flex-1 rounded-lg text-sm font-semibold transition-colors ${FOCUS_RING} ${
                    gastosTab === tab.id
                      ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                      : "text-[var(--color-text-muted)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-6 sm:gap-5 md:grid-cols-2 md:items-start lg:gap-6">
              <div
                id="add-expense"
                className={`min-w-0 ${gastosTab === "variables" ? "block" : "hidden"} md:block`}
              >
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
              <div
                className={`min-w-0 ${gastosTab === "fijos" ? "block" : "hidden"} md:block`}
              >
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
          </>
        )}

        {/* Section: ANALISIS */}
        {activeSection === 'analisis' && (
          <div className="space-y-5">
            <InsightsPanel
              data={insightsQ.data}
              isLoading={insightsQ.isPending}
              error={insightsQ.error as Error | null}
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start lg:gap-5">
              {insightsQ.data && insightsQ.data.category_breakdown.length > 0 ? (
                <SpendingChart
                  breakdown={insightsQ.data.category_breakdown}
                  total={insightsQ.data.total_spent}
                />
              ) : (
                <div className="hidden lg:block" aria-hidden />
              )}
              <Rule503020Panel />
            </div>
          </div>
        )}

        {/* Section: HISTORICO */}
        {activeSection === 'historico' && (
          <MonthHistoryStrip />
        )}

        {/* Section: INGRESOS */}
        {activeSection === 'ingresos' && settings && (
          <IncomeSettingsSection
            settings={settings}
            extras={extraIncomeQ.data ?? []}
            onNavigate={handleSectionChange}
            onSave={() => {
              setToastMsg(t("toasts.changesSaved"));
              void invalidateAll();
            }}
            onExtrasChanged={() => {
              setToastMsg(t("toasts.extraIncomeUpdated"));
              void invalidateAll();
            }}
          />
        )}

        {/* Section: CATEGORIAS */}
        {activeSection === 'categorias' && (
          <CategoriesSection
            categories={categories}
            onNavigate={handleSectionChange}
            onChanged={() => {
              setToastMsg(t("toasts.categoriesUpdated"));
              void invalidateAll();
            }}
          />
        )}

        {/* Section: METAS */}
        {activeSection === 'metas' && (
          <SavingsGoalsSection
            reservedSavings={summaryQ.data?.savings_amount}
            onNavigate={handleSectionChange}
          />
        )}

        {/* Section: TOUR */}
        {activeSection === 'tour' && (
          <TourSection
            onStart={startGuidedTour}
            onNavigate={handleSectionChange}
          />
        )}

        {/* Section: CUENTA */}
        {activeSection === "cuenta" && (
          <AccountSection profileName={profileName} />
        )}
        </div>

        <div className="hidden md:block">
          <SiteFooter />
        </div>
      </main>
      </div>

      {/* Bottom navigation (mobile only) */}
      <BottomNav
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
      />

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
          onEnsureSection={ensureTourSection}
          onBackToMenu={() => {
            setShowTour(false);
            setTourClosedSignal((n) => n + 1);
          }}
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
        className={`pointer-events-none fixed left-4 right-4 z-50 mx-auto max-w-md break-words rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-panel)] px-4 py-3 text-center text-base text-[var(--color-text)] shadow-[var(--shadow-overlay)] transition-all duration-200 ${
          toastMsg ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        } ${toastUndo ? "pointer-events-auto" : ""}`}
        style={{
          bottom:
            "calc(var(--gdh-bottom-chrome-offset, 0px) + 0.75rem)",
        }}
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
            className="font-semibold text-[var(--color-accent)] underline decoration-[var(--color-accent-border)] underline-offset-2 hover:text-[var(--color-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            {toastUndo.label}
          </button></>
        )}
      </div>
    </div>
  );
}
