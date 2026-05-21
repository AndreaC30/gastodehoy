/** 50/30/20 rule: needs / wants / savings vs monthly income. */
import { useQuery } from "@tanstack/react-query";
import { IoPieChartOutline } from "react-icons/io5";
import { api } from "@/api/client";
import type { Rule503020 } from "@/api/types";
import { money } from "@/lib/format";

async function loadRule503020() {
  return api<Rule503020>("/api/rule-503020");
}

function pctBar(
  label: string,
  actual: string | number,
  target: string | number,
  amount: string | number,
  tone: string,
) {
  const actualNum = Number(actual);
  const targetNum = Number(target);
  const width = Math.min(100, Math.max(0, actualNum));
  const over = actualNum > targetNum + 5;
  return (
    <div key={label}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-slate-400">{label}</span>
        <span className="tabular-nums text-slate-300">
          {actual}% <span className="text-slate-600">/ {target}%</span>
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${over ? "bg-amber-500/80" : tone}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="mt-0.5 text-[0.65rem] text-slate-600">{money(amount)}</p>
    </div>
  );
}

export function Rule503020Panel() {
  const { data, isPending, error } = useQuery({
    queryKey: ["rule-503020"],
    queryFn: loadRule503020,
  });

  if (error) {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm text-slate-500">
        No se pudo cargar la regla 50/30/20.
      </p>
    );
  }

  if (isPending) {
    return (
      <div
        className="h-40 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/50"
        aria-label="Cargando regla 50/30/20"
      />
    );
  }

  if (!data) return null;

  return (
    <section
      className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-4 shadow-lg shadow-black/20"
      aria-label="Regla 50/30/20"
    >
      <div className="flex items-start gap-2">
        <IoPieChartOutline
          className="mt-0.5 h-5 w-5 shrink-0 text-teal-400"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold tracking-tight text-slate-300">
            Regla 50/30/20
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Necesidades, deseos y ahorro frente a tu ingreso del mes (
            {money(data.income)})
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {pctBar(
          "Necesidades",
          data.needs_pct,
          data.target_needs_pct,
          data.needs_spent,
          "bg-teal-500/70",
        )}
        {pctBar(
          "Deseos",
          data.wants_pct,
          data.target_wants_pct,
          data.wants_spent,
          "bg-sky-500/70",
        )}
        {pctBar(
          "Ahorro planificado",
          data.savings_pct,
          data.target_savings_pct,
          data.savings_amount,
          "bg-emerald-500/70",
        )}
      </div>

      {Number(data.other_spent) > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          Otros gastos (sin clasificar): {money(data.other_spent)}
        </p>
      )}

      {data.insights.length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-slate-800 pt-3">
          {data.insights.map((msg, i) => (
            <li
              key={i}
              className="rounded-lg border border-slate-800/80 bg-slate-950/50 px-3 py-2 text-xs leading-snug text-slate-400"
            >
              {msg}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
