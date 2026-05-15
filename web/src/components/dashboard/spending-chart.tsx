/** Spending breakdown by category: small donut on desktop + progress-bar legend. */
import type { CategorySpending } from "@/api/types";
import { money } from "@/lib/format";
import { getCategoryIcon } from "@/components/dashboard/category-icon";

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
  const radius = 68;
  const stroke = 26;
  const size = 180;
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
        <p className="text-xs text-slate-500">Total</p>
        <p className="text-base font-bold text-slate-100">{totalLabel}</p>
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
    <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 shadow-lg shadow-black/20 sm:p-5">
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
        <div className="hidden sm:flex sm:gap-8 sm:items-start">
          <div className="sm:pt-2">
          <MiniDonut
            segments={donutSegments}
            totalLabel={money(total)}
          />
          </div>

          {/* progress-bar list right side */}
          <div className="flex-1 space-y-4">
            {sorted.map((seg) => (
              <CategoryRow key={seg.category_id ?? "none"} seg={seg} />
            ))}
          </div>
        </div>

        {/* progress-bar list – mobile only */}
        <div className="mt-4 space-y-4 sm:mt-0 sm:space-y-3 sm:hidden">
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
  const Icon = getCategoryIcon(seg.category_icon);
  const budget =
    seg.monthly_budget != null && seg.monthly_budget !== ""
      ? Number(seg.monthly_budget)
      : null;
  const spent = Number(seg.total);
  const hasBudget = budget != null && budget > 0;
  const budgetPct = hasBudget ? Math.min(100, (spent / budget) * 100) : pct;
  const barWidth = hasBudget ? budgetPct : pct;
  const overBudget = Boolean(seg.over_budget);

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <Icon
          className="h-4 w-4 shrink-0"
          style={{ color: seg.category_color }}
        />

        <span className="min-w-0 flex-1 truncate text-slate-300">
          {seg.category_name}
          {overBudget && (
            <span className="ml-1.5 text-xs font-medium text-amber-400">
              · sobre presupuesto
            </span>
          )}
        </span>

        <span
          className={`shrink-0 basis-full text-right font-semibold sm:basis-auto sm:text-left ${
            overBudget ? "text-amber-300" : "text-slate-200"
          }`}
        >
          {money(seg.total)}
          {hasBudget && (
            <span className="font-normal text-slate-500">
              {" "}
              / {money(budget)}
            </span>
          )}
          <span className="ml-2 text-xs font-normal text-slate-500 sm:ml-0">
            {hasBudget && seg.budget_used_percent != null
              ? `${Number(seg.budget_used_percent).toFixed(0)}% pres.`
              : `${pct.toFixed(0)}%`}
          </span>
        </span>
      </div>

      <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            overBudget ? "bg-amber-500" : ""
          }`}
          style={{
            width: `${barWidth}%`,
            backgroundColor: overBudget ? undefined : seg.category_color,
          }}
        />
      </div>
    </div>
  );
}
