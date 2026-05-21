import type { QueryClient } from "@tanstack/react-query";

/** Keys invalidated together after budget mutations. */
export const BUDGET_QUERY_ROOTS = [
  "summary",
  "settings",
  "fixed",
  "expenses",
  "extra-income",
  "categories",
  "insights",
  "history",
  "savings-goals",
] as const;

export function invalidateBudgetQueries(qc: QueryClient) {
  return qc.invalidateQueries({
    predicate: (q) =>
      BUDGET_QUERY_ROOTS.includes(q.queryKey[0] as (typeof BUDGET_QUERY_ROOTS)[number]),
  });
}
