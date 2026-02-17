export type AccountCode = string;

export type Account = {
  code: AccountCode;
  bank_name: string;
};

export type MonthSummary = {
  id: string;
  month_label: string;
  wage: number;
  float_amount: number;
  starting_point: number;
};

export type ExpenseItem = {
  id: string;
  month_id: string;
  name: string;
  due_day: number;
  account_code: AccountCode;
  amount: number;
  is_recurring: boolean;
};

export type TransferItem = {
  id: string;
  month_id: string;
  to_account_code: AccountCode;
  amount: number;
  note: string | null;
};
