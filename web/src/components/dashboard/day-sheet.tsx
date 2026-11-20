/** Hoja del día: el calendario del icono convertido en la cifra de hoy. */
import { useTranslation } from "react-i18next";
import { money } from "@/lib/format";
import { useAnimatedNumber } from "@/lib/use-animated-number";
import { BTN_PRIMARY } from "@/lib/ui-a11y";
import { TYPE_EYEBROW } from "@/lib/typography";

type Props = {
  /** Fecha de referencia del resumen (YYYY-MM-DD). */
  referenceDate: string | undefined;
  /** Importe que se puede gastar hoy. */
  suggested: number | undefined;
  /** Lo anotado hoy. */
  spentToday: number;
  onAddExpense?: () => void;
};

/** Mes y día ya traducidos; se construye a mediodía local para evitar saltos de zona horaria. */
function useDateParts(referenceDate: string | undefined, lang: string) {
  if (!referenceDate) return null;
  const [y, m, d] = referenceDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d, 12);
  return {
    month: new Intl.DateTimeFormat(lang, { month: "long" }).format(date),
    weekday: new Intl.DateTimeFormat(lang, { weekday: "long" }).format(date),
    day: d,
  };
}

export function DaySheet({ referenceDate, suggested, spentToday, onAddExpense }: Props) {
  const { t, i18n } = useTranslation();
  const animated = useAnimatedNumber(suggested);
  const parts = useDateParts(referenceDate, i18n.language || "es");
  const empty = spentToday <= 0;

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-panel-elevated)]">
      {/* Cabecera de calendario: mes y día. */}
      <div className="flex items-center justify-between bg-[var(--color-accent)] px-4 py-1.5 text-[var(--color-accent-ink)]">
        <span className="text-sm font-semibold capitalize">{parts?.month ?? ""}</span>
        <span className="text-sm font-medium capitalize">
          {parts ? `${parts.weekday} ${parts.day}` : ""}
        </span>
      </div>

      <div className="px-4 pb-4 pt-3">
        <p className={TYPE_EYEBROW}>{t("hero.dailyBudget")}</p>

        {/* Cifra animada: solo visual; el importe final se anuncia aparte. */}
        <p
          className="mt-1 font-display text-[clamp(2.35rem,6.5vh,3.15rem)] font-semibold tabular-nums tracking-tight text-[var(--color-accent)]"
          aria-hidden
        >
          {animated}
        </p>
        <p className="sr-only" role="status" aria-live="polite">
          {suggested != null ? `${t("hero.dailyBudget")}: ${money(suggested)}` : ""}
        </p>

        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {empty
            ? t("hero.nothingToday")
            : t("hero.spentToday", { amount: money(spentToday) })}
        </p>

        {onAddExpense ? (
          <button type="button" onClick={onAddExpense} className={`mt-3 ${BTN_PRIMARY}`}>
            {empty ? t("hero.firstExpense") : t("hero.addExpense")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
