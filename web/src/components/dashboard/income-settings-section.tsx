/** Inline income settings section - full functionality without modal. */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IoClose } from "react-icons/io5";
import { api } from "@/api/client";
import type { Settings } from "@/api/types";
import { INPUT_CLASS } from "@/lib/ui-a11y";

type Props = {
  settings: Settings;
  onSave: () => void;
};

export function IncomeSettingsSection({ settings, onSave }: Props) {
  const { t } = useTranslation();
  const [monthlyIncome, setMonthlyIncome] = useState(settings.monthly_income ?? "");
  const [savingsMode, setSavingsMode] = useState<'percent' | 'fixed' | 'none'>(
    (settings.savings_mode as any) ?? 'none'
  );
  const [savingsPercent, setSavingsPercent] = useState(settings.savings_percent ?? 10);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await api("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          monthly_income: monthlyIncome,
          savings_mode: savingsMode,
          savings_percent: savingsMode === 'percent' ? savingsPercent : undefined,
        }),
      });
      onSave();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[var(--color-text)]">{t("nav.yourIncome")}</h2>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('navigate-section', { detail: 'hoy' }))}
          className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-panel)] hover:text-[var(--color-text)]"
          aria-label="Volver"
        >
          <IoClose className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Monthly Income */}
        <div>
          <label htmlFor="income-monthly" className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
            {t("incomeSettings.monthlyNet")}
          </label>
          <input
            id="income-monthly"
            type="text"
            inputMode="decimal"
            value={monthlyIncome}
            onChange={(e) => setMonthlyIncome(e.target.value)}
            className={`w-full ${INPUT_CLASS}`}
            placeholder="0.00"
          />
        </div>

        {/* Savings Rule */}
        <div className="border-t border-[var(--color-border)] pt-6">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-4">
            {t("incomeSettings.savingsRule")}
          </h3>
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="savings-mode"
                checked={savingsMode === 'percent'}
                onChange={() => setSavingsMode('percent')}
                className="mt-0.5 h-4 w-4 text-[var(--color-accent)]"
              />
              <div className="flex-1">
                <span className="text-sm text-[var(--color-text)]">{t("incomeSettings.percentLabel")}</span>
                {savingsMode === 'percent' && (
                  <div className="mt-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={savingsPercent}
                      onChange={(e) => setSavingsPercent(Number(e.target.value))}
                      className={`w-24 ${INPUT_CLASS} text-sm`}
                    />
                    <span className="ml-2 text-sm text-[var(--color-text-muted)]">%</span>
                  </div>
                )}
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="savings-mode"
                checked={savingsMode === 'fixed'}
                onChange={() => setSavingsMode('fixed')}
                className="mt-0.5 h-4 w-4 text-[var(--color-accent)]"
              />
              <div className="flex-1">
                <span className="text-sm text-[var(--color-text)]">{t("incomeSettings.fixedLabel")}</span>
                <p className="text-xs text-[var(--color-text-dim)] mt-1">
                  (Próximamente: cantidad fija)
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="savings-mode"
                checked={savingsMode === 'none'}
                onChange={() => setSavingsMode('none')}
                className="mt-0.5 h-4 w-4 text-[var(--color-accent)]"
              />
              <span className="text-sm text-[var(--color-text)]">{t("incomeSettings.noneLabel")}</span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="border-t border-[var(--color-border)] pt-6">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--color-bg)] hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Guardando..." : t("common.save")}
          </button>
        </div>
      </div>
    </section>
  );
}
