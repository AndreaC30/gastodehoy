/** SVG donut chart showing spending breakdown by category. */
import type { CategorySpending } from "@/api/types";
import { money } from "@/lib/format";

type Props = {
  breakdown: CategorySpending[];
  total: string | number;
};

export function SpendingChart({ breakdown, total }: Props) {
  const totalNum = Number(total);
  if (totalNum === 0) return null;

  // Build donut segments
  const radius = 80;
  const stroke = 28;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 shadow-lg shadow-black/20">
      <h2 className="text-lg font-bold tracking-tight">
        Gastos por categoría
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Distribución de tus gastos este mes
      </p>

      <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {/* Donut */}
        <div className="relative shrink-0">
          <svg width="180" height="180" viewBox="0 0 180 180">
            {breakdown.map((seg, i) => {
              const pct = Number(seg.percentage) / 100;
              const dashLen = pct * circumference;
              const dashOffset = -cumulative * circumference;
              cumulative += pct;
              return (
                <circle
                  key={i}
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="none"
                  stroke={seg.category_color}
                  strokeWidth={stroke}
                  strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 90 90)"
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-lg font-bold text-slate-100">{money(total)}</p>
          </div>
        </div>

        {/* Legend */}
        <ul className="flex-1 space-y-2">
          {breakdown.map((seg) => (
            <li
              key={seg.category_id ?? "none"}
              className="flex items-center gap-3 text-sm"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: seg.category_color }}
              />
              <span className="flex-1 text-slate-300">
                {seg.category_name}
              </span>
              <span className="text-slate-400">
                {seg.transaction_count} {seg.transaction_count === 1 ? "gasto" : "gastos"}
              </span>
              <span className="min-w-[4rem] text-right font-semibold text-slate-200">
                {money(seg.total)}
              </span>
              <span className="min-w-[3.5rem] text-right text-xs text-slate-500">
                {Number(seg.percentage).toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
