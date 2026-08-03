/**
 * Modal dialog used by the dashboard / monthly income check to edit
 * income + savings (+ extras when focus is full).
 */
import { useTranslation } from "react-i18next";
import type { ExtraIncome, Settings } from "@/api/types";
import {
  IncomeSettingsContent,
  type SettingsFocus,
} from "@/components/dashboard/income-settings-content";
import { AppSheet } from "@/components/ui/app-sheet";

export type { SettingsFocus };

type Props = {
  initial: Settings;
  extras: ExtraIncome[];
  onClose: () => void;
  onBackToMenu?: () => void;
  onSaved: (next: Settings) => void;
  onExtrasChanged: () => void;
  /** Defaults to full settings modal with both tabs. */
  focus?: SettingsFocus;
  title?: string;
  subtitle?: string;
  saveLabel?: string;
};

/** Controlled modal: pre-fills with `initial` and reports the saved row. */
export function SettingsModal({
  initial,
  extras,
  onClose,
  onBackToMenu,
  onSaved,
  onExtrasChanged,
  focus = "full",
  title,
  subtitle,
  saveLabel,
}: Props) {
  const { t } = useTranslation();

  return (
    <AppSheet
      open
      onClose={onClose}
      title={title ?? t("incomeSettings.title")}
      subtitle={subtitle ?? t("incomeSettings.subtitle")}
      zClass="z-50"
      labelledById="settings-modal-title"
    >
      <IncomeSettingsContent
        initial={initial}
        extras={extras}
        focus={focus}
        saveLabel={saveLabel}
        variant="modal"
        idPrefix="settings"
        onClose={onClose}
        onBackToMenu={onBackToMenu}
        onSaved={onSaved}
        onExtrasChanged={onExtrasChanged}
      />
    </AppSheet>
  );
}
