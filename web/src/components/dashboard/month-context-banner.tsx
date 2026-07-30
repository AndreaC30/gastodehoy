import { useCallback, useState } from "react";
import { IoClose } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import {
  budgetReferenceDate,
  daysLeftInMonth,
  dismissMonthTip,
  formatMonthLong,
  isMonthEndWindow,
  isMonthStartWindow,
  isMonthTipDismissed,
} from "@/lib/month-context";
import { TYPE_CAPTION } from "@/lib/typography";
import { FOCUS_RING } from "@/lib/ui-a11y";

type Props = {
  referenceDate?: string;
};

export function MonthContextBanner({ referenceDate }: Props) {
  const { t, i18n } = useTranslation();
  const today = budgetReferenceDate(referenceDate);
  const [dismissed, setDismissed] = useState(() => isMonthTipDismissed(today));

  const inStart = isMonthStartWindow(today);
  const inEnd = isMonthEndWindow(today);
  const visible = (inStart || inEnd) && !dismissed;

  const handleDismiss = useCallback(() => {
    dismissMonthTip(budgetReferenceDate(referenceDate));
    setDismissed(true);
  }, [referenceDate]);

  if (!visible) return null;

  const showStart = inStart;
  const monthLabel = formatMonthLong(today, i18n.language);
  const daysLeft = daysLeftInMonth(today);

  return (
    <div
      role="status"
      className="rounded-2xl border border-[var(--color-ok-border)] bg-[var(--color-ok-dim)] px-4 py-3.5 sm:rounded-xl sm:px-4 sm:py-3"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold normal-case text-[var(--color-ok)] sm:text-base">
            {showStart
              ? t("monthContext.bannerNewMonthTitle")
              : t("monthContext.bannerEndMonthTitle", { month: monthLabel })}
          </p>
          <p className={`mt-1.5 normal-case ${TYPE_CAPTION} text-[var(--color-ok)]/85`}>
            {showStart
              ? t("monthContext.bannerNewMonthBody")
              : t("monthContext.bannerEndMonthBody", {
                  count: daysLeft,
                  month: monthLabel,
                })}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className={`min-h-11 min-w-11 shrink-0 rounded-xl p-1.5 text-[var(--color-ok)]/80 hover:bg-[var(--color-ok)]/10 hover:text-[var(--color-ok)] ${FOCUS_RING}`}
          aria-label={t("monthContext.bannerDismiss")}
        >
          <IoClose className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
