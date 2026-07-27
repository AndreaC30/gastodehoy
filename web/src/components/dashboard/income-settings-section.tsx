/**
 * Inline “Tus ingresos” section — reuses SettingsModal (correct i18n + extra income).
 */
import { useTranslation } from "react-i18next";
import type { ExtraIncome, Settings } from "@/api/types";
import { SettingsModal } from "@/components/settings-modal";
import type { DashboardSection } from "@/lib/dashboard-state";

type Props = {
  settings: Settings;
  extras: ExtraIncome[];
  onSave: () => void;
  onExtrasChanged: () => void;
  onNavigate?: (section: DashboardSection) => void;
};

export function IncomeSettingsSection({
  settings,
  extras,
  onSave,
  onExtrasChanged,
  onNavigate,
}: Props) {
  const { t } = useTranslation();

  return (
    <SettingsModal
      initial={settings}
      extras={extras}
      title={t("nav.yourIncome")}
      subtitle={t("incomeSettings.subtitle")}
      onClose={() => onNavigate?.("hoy")}
      onSaved={() => onSave()}
      onExtrasChanged={onExtrasChanged}
    />
  );
}
