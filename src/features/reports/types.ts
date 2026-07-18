export type ReportEntryRow = {
  date: string;
  description: string;
  type: "income" | "expense" | "transfer";
  categoryName: string;
  sourceName: string;
  status: "paid" | "pending" | "cancelled";
  amountCents: number;
};

export type MonthlyReportData = {
  month: string; // "YYYY-MM-01"
  incomePaidCents: number;
  expensePaidCents: number;
  netPaidCents: number;
  entries: ReportEntryRow[];
};

export type AnnualMonthRow = {
  month: string; // "YYYY-MM-01"
  incomeCents: number;
  expenseCents: number;
  netCents: number;
};

export type AnnualReportData = {
  year: number;
  months: AnnualMonthRow[];
  totalIncomeCents: number;
  totalExpenseCents: number;
  totalNetCents: number;
};
