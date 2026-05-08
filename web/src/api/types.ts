export type Summary = {
  reference_date: string;
  days_remaining_in_month: number;
  monthly_income: string | number;
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
  savings_percent: string | number;
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

export type User = {
  id: number;
  email: string;
  name: string;
};
