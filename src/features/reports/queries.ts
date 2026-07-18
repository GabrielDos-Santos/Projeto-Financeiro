import { endOfMonth } from "date-fns";

import { createClient } from "@/lib/supabase/server";
import { parseDateOnly, toDateOnly } from "@/lib/dates";
import type {
  AnnualReportData,
  MonthlyReportData,
  ReportEntryRow,
} from "./types";

/**
 * Linhas de `v_entries` da competência traduzidas para exibição/export —
 * mesma fonte do dashboard e das telas de origem (critério de pronto §11).
 */
async function getEntryRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fromISO: string,
  toISO: string,
): Promise<ReportEntryRow[]> {
  const [entriesResult, categoriesResult, accountsResult, cardsResult] =
    await Promise.all([
      supabase
        .from("v_entries")
        .select(
          "id, date, description, type, category_id, account_id, credit_card_id, status, amount_cents",
        )
        .neq("status", "cancelled")
        .gte("date", fromISO)
        .lte("date", toISO)
        .order("date", { ascending: true })
        .order("id", { ascending: true }),
      supabase.from("categories").select("id, name"),
      supabase.from("accounts").select("id, name"),
      supabase.from("credit_cards").select("id, name"),
    ]);

  const categoryById = new Map(
    (categoriesResult.data ?? []).map((c) => [c.id, c.name]),
  );
  const accountById = new Map(
    (accountsResult.data ?? []).map((a) => [a.id, a.name]),
  );
  const cardById = new Map((cardsResult.data ?? []).map((c) => [c.id, c.name]));

  return (entriesResult.data ?? []).map((entry) => ({
    date: entry.date ?? "",
    description: entry.description ?? "",
    type: entry.type ?? "expense",
    categoryName: entry.category_id
      ? (categoryById.get(entry.category_id) ?? "—")
      : "Transferência",
    sourceName: entry.credit_card_id
      ? (cardById.get(entry.credit_card_id) ?? "—")
      : entry.account_id
        ? (accountById.get(entry.account_id) ?? "—")
        : "—",
    status: entry.status ?? "pending",
    amountCents: entry.amount_cents ?? 0,
  }));
}

/** Relatório mensal: resumo (mesma fonte do dashboard) + lista de lançamentos. */
export async function getMonthlyReport(
  monthISO: string,
): Promise<MonthlyReportData> {
  const supabase = await createClient();
  const fromISO = monthISO;
  const toISO = toDateOnly(endOfMonth(parseDateOnly(monthISO)));

  const [summaryResult, entries] = await Promise.all([
    supabase
      .from("v_monthly_summary")
      .select("income_paid_cents, expense_paid_cents, net_paid_cents")
      .eq("month", monthISO)
      .maybeSingle(),
    getEntryRows(supabase, fromISO, toISO),
  ]);

  return {
    month: monthISO,
    incomePaidCents: summaryResult.data?.income_paid_cents ?? 0,
    expensePaidCents: summaryResult.data?.expense_paid_cents ?? 0,
    netPaidCents: summaryResult.data?.net_paid_cents ?? 0,
    entries,
  };
}

/** Relatório anual: 12 meses de `v_monthly_summary` (paid) + totais. */
export async function getAnnualReport(year: number): Promise<AnnualReportData> {
  const supabase = await createClient();
  const fromISO = `${year}-01-01`;
  const toISO = `${year}-12-01`;

  const { data } = await supabase
    .from("v_monthly_summary")
    .select("month, income_paid_cents, expense_paid_cents, net_paid_cents")
    .gte("month", fromISO)
    .lte("month", toISO);

  const byMonth = new Map(
    (data ?? []).map((row) => [
      row.month,
      {
        income: row.income_paid_cents ?? 0,
        expense: row.expense_paid_cents ?? 0,
        net: row.net_paid_cents ?? 0,
      },
    ]),
  );

  const months = Array.from({ length: 12 }, (_, i) => {
    const monthISO = `${year}-${String(i + 1).padStart(2, "0")}-01`;
    const found = byMonth.get(monthISO);
    return {
      month: monthISO,
      incomeCents: found?.income ?? 0,
      expenseCents: found?.expense ?? 0,
      netCents: found?.net ?? 0,
    };
  });

  return {
    year,
    months,
    totalIncomeCents: months.reduce((sum, m) => sum + m.incomeCents, 0),
    totalExpenseCents: months.reduce((sum, m) => sum + m.expenseCents, 0),
    totalNetCents: months.reduce((sum, m) => sum + m.netCents, 0),
  };
}
