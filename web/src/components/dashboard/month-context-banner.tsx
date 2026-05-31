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
      className="rounded-xl border border-slate-900 bg-teal-950/25 px-3 py-3 sm:px-4"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold normal-case text-teal-200 sm:text-base">
            {showStart
              ? t("monthContext.bannerNewMonthTitle")
              : t("monthContext.bannerEndMonthTitle", { month: monthLabel })}
          </p>
          <p className={`mt-1 normal-case ${TYPE_CAPTION} text-teal-200/80`}>
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
          className={`shrink-0 rounded-lg p-1.5 text-teal-300/80 hover:bg-teal-500/10 hover:text-teal-200 ${FOCUS_RING}`}
          aria-label={t("monthContext.bannerDismiss")}
        >
          <IoClose className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
