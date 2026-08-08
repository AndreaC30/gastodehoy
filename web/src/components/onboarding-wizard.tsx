/**
 * First-run wizard shown right after sign-up (or whenever the user has
 * no income yet). Three steps:
 *   1) Monthly income
 *   2) Fixed expenses (optional list)
 *   3) Savings rule (% of income or fixed amount)
 *
 * On finish it persists the settings and creates the fixed expenses
 * before handing control back to the parent.
 */
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoArrowBack, IoArrowForward } from "react-icons/io5";
import { api } from "@/api/client";
import type { FixedExpense, SavingsMode, Settings } from "@/api/types";
import {
  DEFAULT_FIXED_EXPENSE_ICON,
  getCategoryIcon,
} from "@/components/dashboard/category-icon";
import { IconSelectDropdown } from "@/components/dashboard/icon-select-dropdown";
import { money } from "@/lib/format";

type Props = {
  userName: string;
  onDone: () => void;
  onSkip: () => void;
};

type Step = 1 | 2 | 3;

/** In-memory representation of a fixed expense before it's POSTed. */
type LocalFixed = { name: string; amount: string; icon: string };

/** Public wrapper: orchestrates the three steps and the final save. */
export function OnboardingWizard({ userName, onDone, onSkip }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(1);
  const [income, setIncome] = useState("");
  const [fixed, setFixed] = useState<LocalFixed[]>([]);
  const [mode, setMode] = useState<SavingsMode>("percent");
  const [percent, setPercent] = useState("10");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canNext1 = income.trim() !== "" && Number(income) >= 0;
  const canFinish =
    mode === "percent"
      ? percent.trim() !== "" &&
        Number(percent) >= 0 &&
        Number(percent) <= 100
      : amount.trim() !== "" && Number(amount) >= 0;

  async function finish() {
    setError(null);
    setBusy(true);
    try {
      const payload: Settings = {
        monthly_income: income || "0",
        savings_mode: mode,
        savings_percent: mode === "percent" ? percent || "0" : "0",
        savings_amount: mode === "fixed" ? amount || "0" : "0",
      };
      await api<Settings>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      // Crea cada gasto fijo en serie; son pocos y simplifica el manejo de errores.
      for (const f of fixed) {
        if (!f.name.trim()) continue;
        await api<FixedExpense>("/api/fixed-expenses", {
          method: "POST",
          body: JSON.stringify({
            name: f.name.trim(),
            amount: f.amount || "0",
            icon: f.icon,
          }),
        });
      }
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col px-4 py-6 sm:min-h-screen sm:justify-center sm:py-12">
      <header className="mb-6 text-center">
        <p className="text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
          {t("onboarding.greeting", { name: userName })}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
          {t("onboarding.title")}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {t("onboarding.subtitle")}
        </p>
      </header>

      <Stepper step={step} />

      <section className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-panel)]/70 p-5 shadow-xl shadow-black/30 md:p-6">
        {error && (
          <div className="mb-4 rounded-xl border border-[var(--color-crit-border)] bg-[var(--color-crit-dim)] px-4 py-3 text-sm text-[var(--color-crit)]">
            {error}
          </div>
        )}

        {step === 1 && (
          <StepIncome
            income={income}
            setIncome={setIncome}
            onNext={() => setStep(2)}
            disabled={!canNext1}
            onSkip={onSkip}
          />
        )}

        {step === 2 && (
          <StepFixed
            items={fixed}
            setItems={setFixed}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <StepSavings
            income={income}
            mode={mode}
            setMode={setMode}
            percent={percent}
            setPercent={setPercent}
            amount={amount}
            setAmount={setAmount}
            onBack={() => setStep(2)}
            onFinish={finish}
            disabled={!canFinish || busy}
            busy={busy}
          />
        )}
      </section>
    </div>
  );
}

/** Three-dot progress indicator at the top of the wizard. */
function Stepper({ step }: { step: Step }) {
  return (
    <ol className="mb-6 flex items-center justify-center gap-2 text-xs text-[var(--color-text-dim)]">
      {[1, 2, 3].map((n) => (
        <li
          key={n}
          className={`flex items-center gap-2 ${
            step === n ? "text-[var(--color-accent)]" : ""
          }`}
        >
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full border ${
              step === n
                ? "border-[var(--color-accent-border)] bg-[var(--color-accent-dim)] text-[var(--color-accent)]"
                : step > n
                  ? "border-[var(--color-border-subtle)] bg-[var(--color-panel-elevated)] text-[var(--color-text-muted)]"
                  : "border-[var(--color-border)] text-[var(--color-text-dim)]"
            }`}
          >
            {n}
          </span>
          {n < 3 && <span className="h-px w-8 bg-[var(--color-border)]" />}
        </li>
      ))}
    </ol>
  );
}

/** Step 1: ask for monthly income. */
function StepIncome({
  income,
  setIncome,
  onNext,
  disabled,
  onSkip,
}: {
  income: string;
  setIncome: (v: string) => void;
  onNext: () => void;
  disabled: boolean;
  onSkip: () => void;
}) {
  const { t } = useTranslation();
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (!disabled) onNext();
      }}
      className="space-y-4"
    >
      <div>
        <h2 className="text-lg font-bold tracking-tight">
          {t("onboarding.incomeQuestion")}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {t("onboarding.incomeDescription")}
        </p>
        <p className="mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/50 px-3 py-2 text-xs leading-relaxed text-[var(--color-text-dim)]">
          {t("onboarding.incomeExamples")}
        </p>
      </div>
      <label htmlFor="onboarding-income" className="block text-sm font-medium text-[var(--color-text-muted)]">
        {t("onboarding.incomeLabel")}
        <input
          id="onboarding-income"
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          autoFocus
          value={income}
          onChange={(e) => setIncome(e.target.value)}
          placeholder="2000.00"
          className="mt-1.5 w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg)] px-3 py-2.5 text-[var(--color-text)] outline-none focus:border-[var(--color-accent-border)] focus:ring-2 focus:ring-[var(--color-accent-dim)]"
        />
      </label>
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-[var(--color-text-dim)] underline decoration-[var(--color-border-subtle)] underline-offset-4 hover:text-[var(--color-text-muted)]"
        >
          {t("onboarding.configureLater")}
        </button>
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--color-accent-ink)] hover:brightness-110 disabled:opacity-60"
        >
          {t("onboarding.next")}
          <IoArrowForward className="h-4 w-4 shrink-0" aria-hidden />
        </button>
      </div>
    </form>
  );
}

/** Step 2: optional list of fixed expenses (rent, subscriptions, ...). */
function StepFixed({
  items,
  setItems,
  onBack,
  onNext,
}: {
  items: LocalFixed[];
  setItems: (next: LocalFixed[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [icon, setIcon] = useState(DEFAULT_FIXED_EXPENSE_ICON);

  function add(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setItems([...items, { name: n, amount: amount || "0", icon }]);
    setName("");
    setAmount("");
    setIcon(DEFAULT_FIXED_EXPENSE_ICON);
  }

  function remove(i: number) {
    setItems(items.filter((_, idx) => idx !== i));
  }

  const total = items.reduce((s, it) => s + Number(it.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight">
          {t("onboarding.fixedQuestion")}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {t("onboarding.fixedDescription")}
        </p>
        <p className="mt-2 rounded-lg border border-dashed border-[var(--color-border-subtle)] px-3 py-2 text-xs leading-relaxed text-[var(--color-text-dim)]">
          {t("onboarding.fixedOptional")}
        </p>
      </div>

      <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <div className="flex w-full min-w-0 gap-2 sm:min-w-[140px] sm:flex-1">
          <IconSelectDropdown value={icon} onChange={setIcon} />
          <input
            id="onboarding-fixed-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("fixedExpenses.placeholder")}
            aria-label={t("onboarding.fixedNameLabel")}
            className="min-w-0 flex-1 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent-border)] focus:ring-2 focus:ring-[var(--color-accent-dim)]"
          />
        </div>
        <input
          id="onboarding-fixed-amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={t("onboarding.fixedAmountPlaceholder")}
          aria-label={t("onboarding.fixedAmountLabel")}
          className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent-border)] focus:ring-2 focus:ring-[var(--color-accent-dim)] sm:w-24"
        />
        <button
          type="submit"
          className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-ink)] hover:brightness-110 sm:w-auto"
        >
          {t("fixedExpenses.add")}
        </button>
      </form>

      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((it, i) => {
            const FixedIcon = getCategoryIcon(it.icon);
            return (
            <li
              key={`${it.name}-${i}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-panel)]/80 px-3 py-2.5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <FixedIcon className="h-4 w-4 shrink-0 text-[var(--color-accent)]/90" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--color-text)]">{it.name}</p>
                  <p className="truncate text-sm tabular-nums text-[var(--color-text-dim)]">{money(it.amount)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="shrink-0 rounded-lg border border-[var(--color-crit-border)] px-2.5 py-1 text-sm font-medium text-[var(--color-crit)] hover:bg-[var(--color-crit-dim)]"
              >
                {t("common.remove")}
              </button>
            </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-[var(--color-border)] px-4 py-3 text-center text-sm text-[var(--color-text-dim)]">
          {t("onboarding.fixedEmpty")}
        </p>
      )}

      {items.length > 0 && (
        <p className="text-right text-xs text-[var(--color-text-dim)]">
          {t("onboarding.fixedTotal", { total: money(total) })}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <IoArrowBack className="h-4 w-4 shrink-0" aria-hidden />
          {t("common.back")}
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--color-accent-ink)] hover:brightness-110"
        >
          {t("onboarding.next")}
          <IoArrowForward className="h-4 w-4 shrink-0" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/**
 * Step 3: savings rule. Toggles between % of income and fixed €/month
 * and shows a live preview of the resulting amount.
 */
function StepSavings({
  income,
  mode,
  setMode,
  percent,
  setPercent,
  amount,
  setAmount,
  onBack,
  onFinish,
  disabled,
  busy,
}: {
  income: string;
  mode: SavingsMode;
  setMode: (m: SavingsMode) => void;
  percent: string;
  setPercent: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  onBack: () => void;
  onFinish: () => void;
  disabled: boolean;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const incomeNum = Number(income) || 0;
  const previewAmount =
    mode === "percent"
      ? (incomeNum * (Number(percent) || 0)) / 100
      : Number(amount) || 0;

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (!disabled) onFinish();
      }}
      className="space-y-4"
    >
      <div>
        <h2 className="text-lg font-bold tracking-tight">
          {t("onboarding.savingsQuestion")}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {t("onboarding.savingsSubtitle")}
        </p>
        <p className="mt-2 rounded-lg border border-[var(--color-accent-border)] bg-[var(--color-accent-dim)] px-3 py-2 text-xs leading-relaxed text-[var(--color-accent)]">
          {t("onboarding.savingsTip")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)]/50 p-1 text-sm">
        <ModeBtn active={mode === "percent"} onClick={() => setMode("percent")}>
          {t("incomeSettings.savingsPercent")}
        </ModeBtn>
        <ModeBtn active={mode === "fixed"} onClick={() => setMode("fixed")}>
          {t("incomeSettings.savingsFixed")}
        </ModeBtn>
      </div>

      {mode === "percent" ? (
        <label htmlFor="onboarding-savings-percent" className="block text-sm font-medium text-[var(--color-text-muted)]">
          {t("onboarding.savingsPercent")}
          <div className="mt-1.5 flex min-w-0 items-center gap-2">
            <input
              id="onboarding-savings-percent"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              max={100}
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              autoFocus
              className="min-w-0 flex-1 max-w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg)] px-3 py-2.5 outline-none focus:border-[var(--color-accent-border)] focus:ring-2 focus:ring-[var(--color-accent-dim)]"
            />
            <span className="shrink-0 text-[var(--color-text-dim)]">%</span>
          </div>
        </label>
      ) : (
        <label htmlFor="onboarding-savings-amount" className="block text-sm font-medium text-[var(--color-text-muted)]">
          {t("onboarding.savingsFixedLabel")}
          <div className="mt-1.5 flex min-w-0 items-center gap-2">
            <input
              id="onboarding-savings-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              placeholder="200.00"
              className="min-w-0 flex-1 max-w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg)] px-3 py-2.5 outline-none focus:border-[var(--color-accent-border)] focus:ring-2 focus:ring-[var(--color-accent-dim)]"
            />
            <span className="shrink-0 text-[var(--color-text-dim)]">€</span>
          </div>
        </label>
      )}

      <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-panel)]/60 px-4 py-3 text-sm">
        <p className="text-[var(--color-text-dim)]">{t("onboarding.summary")}</p>
        <p className="mt-1 text-[var(--color-text-muted)]">
          {t("onboarding.savePrefix")}<strong className="text-[var(--color-accent)]">{money(previewAmount)}</strong>{t("onboarding.saveSuffix")}
          {mode === "percent" && incomeNum > 0
            ? ` (${percent}% ${t("onboarding.saveOf")} ${money(incomeNum)})`
            : ""}
          {mode === "fixed" ? ` ${t("onboarding.saveFixedNote")}` : ""}.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <IoArrowBack className="h-4 w-4 shrink-0" aria-hidden />
          {t("tour.back")}
        </button>
        <button
          type="submit"
          disabled={disabled}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--color-accent-ink)] hover:brightness-110 disabled:opacity-60"
        >
          {busy ? t("incomeSettings.saving") : t("onboarding.start")}
        </button>
      </div>
    </form>
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
          ? "bg-[var(--color-panel)] text-[var(--color-text)] shadow-inner"
          : "text-[var(--color-text-dim)] hover:text-[var(--color-text-muted)]"
      }`}
    >
      {children}
    </button>
  );
}
