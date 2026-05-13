/** Spending breakdown by category: small donut on desktop + progress-bar legend. */
import type { CategorySpending } from "@/api/types";
import { money } from "@/lib/format";

type Props = {
  breakdown: CategorySpending[];
  total: string | number;
};

/* ── tiny donut for desktop (kept simple, 120×120) ────────────── */

function MiniDonut({
  segments,
  totalLabel,
}: {
  segments: { color: string; pct: number }[];
  totalLabel: string;
}) {
  const radius = 44;
  const stroke = 18;
  const size = 120;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg, i) => {
          const pct = seg.pct / 100;
          const dashLen = pct * circumference;
          const gap = circumference - dashLen;
          const dashOffset = -cumulative * circumference;
          cumulative += pct;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${dashLen} ${gap}`}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="transition-all duration-500"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[10px] text-slate-500">Total</p>
        <p className="text-sm font-bold text-slate-100">{totalLabel}</p>
      </div>
    </div>
  );
}

/* ── main component ────────────────────────────────────────────── */

export function SpendingChart({ breakdown, total }: Props) {
  const totalNum = Number(total);
  if (totalNum === 0) return null;

  const donutSegments = breakdown.map((s) => ({
    color: s.category_color,
    pct: Number(s.percentage),
  }));

  /* sort highest-first so the biggest bar is on top */
  const sorted = [...breakdown].sort(
    (a, b) => Number(b.total) - Number(a.total),
  );

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 shadow-lg shadow-black/20">
      <h2 className="text-lg font-bold tracking-tight">
        Gastos por categoría
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Distribución de tus gastos este mes
      </p>

      {/*
        Desktop (≥ sm): two-column layout
          left  – small donut
          right – progress-bar legend
        Mobile: single-column progress-bar legend only
      */}
      <div className="mt-5">
        {/* donut – desktop only */}
        <div className="hidden sm:flex sm:gap-6 sm:items-start">
          <MiniDonut
            segments={donutSegments}
            totalLabel={money(total)}
          />

          {/* progress-bar list right side */}
          <div className="flex-1 space-y-3">
            {sorted.map((seg) => (
              <CategoryRow key={seg.category_id ?? "none"} seg={seg} />
            ))}
          </div>
        </div>

        {/* progress-bar list – mobile only */}
        <div className="space-y-3 sm:hidden">
          {sorted.map((seg) => (
            <CategoryRow key={seg.category_id ?? "none"} seg={seg} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── single category row with progress bar ─────────────────────── */

function CategoryRow({ seg }: { seg: CategorySpending }) {
  const pct = Number(seg.percentage);

  return (
    <div>
      {/* top line: dot + icon + name  |  amount + percentage */}
      <div className="flex items-center gap-2 text-sm">
        {/* colour dot */}
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: seg.category_color }}
        />

        {/* optional emoji icon */}
        {seg.category_icon && (
          <span className="shrink-0 text-sm">{seg.category_icon}</span>
        )}

        {/* category name */}
        <span className="flex-1 truncate text-slate-300">
          {seg.category_name}
        </span>

        {/* amount – bold */}
        <span className="shrink-0 font-semibold text-slate-200">
          {money(seg.total)}
        </span>

        {/* percentage – muted */}
        <span className="shrink-0 text-xs text-slate-500">
          {pct.toFixed(0)}%
        </span>
      </div>

      {/* progress bar */}
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: seg.category_color,
          }}
        />
      </div>
    </div>
  );
}
