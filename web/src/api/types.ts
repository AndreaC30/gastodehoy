/**
 * Wire-format types shared between the API client and components.
 *
 * Numeric fields can come back from FastAPI either as numbers or as
 * strings (Decimal serialisation), hence the `string | number` unions.
 */

/** How the user wants their savings computed each month. */
export type SavingsMode = "percent" | "fixed";

export type MonthHistoryItem = {
  year: number;
  month: number;
  month_label: string;
  period_start: string;
  period_end: string;
  variable_spent_month: string | number;
  savings_amount: string | number;
  remaining_this_month: string | number;
};

/** API response for GET /api/summary/history */
export type MonthHistoryRead = {
  months: MonthHistoryItem[];
};

export type Summary = {
  reference_date: string;
  days_remaining_in_month: number;
  monthly_income: string | number;
  extra_income_month: string | number;
  extra_income_saved_month?: string | number;
  savings_mode: SavingsMode;
  savings_percent: string | number;
  savings_amount: string | number;
  fixed_expenses_total: string | number;
  variable_spent_month: string | number;
  monthly_budget_after_fixed_and_savings: string | number;
  remaining_this_month: string | number;
  suggested_spend_today: string | number;
};

export type Settings = {
  monthly_income: string | number;
  savings_mode: SavingsMode;
  savings_percent: string | number;
  savings_amount: string | number;
  dashboard_tour_completed?: boolean;
  /** YYYY-MM — last month the user completed the day-1 income check. */
  income_check_month?: string | null;
  language?: string | null;
};

export type FixedExpense = {
  id: number;
  name: string;
  amount: string | number;
  icon: string | null;
};

export type ExpenseCategory = {
  id: number;
  name: string;
  color: string;
  icon: string | null;
  monthly_budget: string | number | null;
  is_default: boolean;
};

export type VariableExpense = {
  id: number;
  amount: string | number;
  occurred_at: string;
  note: string | null;
  category_id: number | null;
  category_name?: string | null;
  category_color?: string | null;
  category_icon?: string | null;
};

export type PaginatedMeta = {
  total: number;
  limit: number;
  offset: number;
};

/** API response for GET /api/expenses */
export type PaginatedVariableExpenses = {
  items: VariableExpense[];
  meta: PaginatedMeta;
};

/** Occasional income received on a specific date (bonus, extra payroll…). */
export type ExtraIncomeSavingsMode = "none" | "all" | "percent" | "fixed";

export type ExtraIncome = {
  id: number;
  amount: string | number;
  received_at: string;
  savings_mode: ExtraIncomeSavingsMode;
  savings_percent: string | number;
  savings_fixed: string | number;
};

export type CategorySpending = {
  category_id: number | null;
  category_name: string;
  category_color: string;
  category_icon: string | null;
  total: string | number;
  percentage: string | number;
  transaction_count: number;
  monthly_budget: string | number | null;
  over_budget: boolean;
  budget_used_percent: string | number | null;
};

export type InsightItem = {
  type: "warning" | "tip" | "success" | "info";
  title: string;
  message: string;
  icon: string;
};

export type Insights = {
  period_start: string;
  period_end: string;
  total_spent: string | number;
  top_category: CategorySpending | null;
  category_breakdown: CategorySpending[];
  insights: InsightItem[];
  avg_daily_spend: string | number;
  projected_monthly: string | number;
};

export type DailyNotification = {
  tag: string;
  title: string;
  body: string;
};

export type User = {
  id: number;
  email: string;
  name: string;
  /** True hasta que cambie la contraseña temporal enviada por correo. */
  must_change_password?: boolean;
};

export type RegisterResponse = {
  user: User;
};

export type ForgotPasswordResponse = {
  detail: string;
};

export type SavingsGoal = {
  id: number;
  name: string;
  target_amount: string | number;
  current_amount: string | number;
  target_date: string | null;
};

/** API response for GET /api/rule-503020 */
export type Rule503020 = {
  year: number;
  month: number;
  income: string | number;
  savings_amount: string | number;
  needs_spent: string | number;
  wants_spent: string | number;
  other_spent: string | number;
  needs_pct: string | number;
  wants_pct: string | number;
  savings_pct: string | number;
  target_needs_pct: string | number;
  target_wants_pct: string | number;
  target_savings_pct: string | number;
  insights: { type: "ok" | "warn" | "info"; text: string }[];
};
