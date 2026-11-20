/** Ritmo del mes: barra de gastado frente a mes recorrido, con estado en icono y texto. */
import { useTranslation } from "react-i18next";
import { IoAlertCircle, IoCheckmarkCircle, IoWarning } from "react-icons/io5";
import type { IconType } from "react-icons";
import type { PaceStatus } from "@/api/types";
import { TYPE_EYEBROW } from "@/lib/typography";

type Props = {
  status: PaceStatus;
  /** % gastado del presupuesto; null si no hay presupuesto. */
  spentPercent: number | null;
  /** % del mes ya recorrido. */
  elapsedPercent: number;
};

const TONE: Record<
  Exclude<PaceStatus, "none">,
  { Icon: IconType; text: string; bar: string; box: string }
> = {
  ok: {
    Icon: IoCheckmarkCircle,
    text: "text-[var(--color-ok)]",
    bar: "bg-[var(--color-ok)]",
    box: "border-[var(--color-ok-border)] bg-[var(--color-ok-dim)]",
  },
  tight: {
    Icon: IoAlertCircle,
    text: "text-[var(--color-warn)]",
    bar: "bg-[var(--color-warn)]",
    box: "border-[var(--color-warn-border)] bg-[var(--color-warn-dim)]",
  },
  over: {
    Icon: IoWarning,
    text: "text-[var(--color-crit)]",
    bar: "bg-[var(--color-crit)]",
    box: "border-[var(--color-crit-border)] bg-[var(--color-crit-dim)]",
  },
};

const clamp = (n: number) => Math.max(0, Math.min(100, n));
const pct = (n: number) => `${Math.round(n)} %`;

export function PaceMeter({ status, spentPercent, elapsedPercent }: Props) {
  const { t } = useTranslation();
  if (status === "none") return null;
  const tone = TONE[status];
  const spent = spentPercent ?? 100;

  return (
    <div>
      <p className={TYPE_EYEBROW}>{t("pace.title")}</p>

      {/* La barra es solo visual: las cifras y el estado están en texto. */}
      <div
        className="relative mt-2 h-2.5 w-full rounded-full bg-[var(--color-panel-elevated)]"
        aria-hidden
      >
        <div
          className={`h-full rounded-full ${tone.bar}`}
          style={{ width: `${clamp(spent)}%` }}
        />
        <div
          className="absolute -top-1 h-[18px] w-0.5 rounded bg-[var(--color-text)]"
          style={{ left: `calc(${clamp(elapsedPercent)}% - 1px)` }}
        />
      </div>

      <dl className="mt-2 flex justify-between gap-3 text-sm text-[var(--color-text-muted)]">
        {spentPercent == null ? (
          <div>
            <dt className="sr-only">{t("pace.spent")}</dt>
            <dd>{t("pace.noBudget")}</dd>
          </div>
        ) : (
          <div>
            <dt className="inline">{t("pace.spent")} </dt>
            <dd className="inline font-semibold tabular-nums text-[var(--color-text)]">
              {pct(spentPercent)}
            </dd>
          </div>
        )}
        <div className="text-right">
          <dt className="inline">{t("pace.elapsed")} </dt>
          <dd className="inline font-semibold tabular-nums text-[var(--color-text)]">
            {pct(elapsedPercent)}
          </dd>
        </div>
      </dl>

      <p
        role="status"
        className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${tone.box}`}
      >
        <tone.Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.text}`} aria-hidden />
        <span>
          <strong className={tone.text}>{t(`pace.status.${status}`)}</strong>
          <span className="text-[var(--color-text-muted)]">
            {" · "}
            {t(`pace.hint.${status}`)}
          </span>
        </span>
      </p>
    </div>
  );
}
