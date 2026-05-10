/**
 * Wire-format types shared between the API client and components.
 *
 * Numeric fields can come back from FastAPI either as numbers or as
 * strings (Decimal serialisation), hence the `string | number` unions.
 */

/** How the user wants their savings computed each month. */
export type SavingsMode = "percent" | "fixed";

export type Summary = {
  reference_date: string;
  days_remaining_in_month: number;
  monthly_income: string | number;
  extra_income_month: string | number;
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
};

export type FixedExpense = {
  id: number;
  name: string;
  amount: string | number;
};

export type VariableExpense = {
  id: number;
  amount: string | number;
  occurred_at: string;
  note: string | null;
};

/** Occasional income received on a specific date (bonus, extra payroll…). */
export type ExtraIncome = {
  id: number;
  amount: string | number;
  received_at: string;
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
