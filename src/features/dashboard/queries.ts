import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

import { createClient } from "@/lib/supabase/server";
import { toDateOnly, todayISO } from "@/lib/dates";

function currentMonthRange() {
  const now = new Date();
  return {
    start: toDateOnly(startOfMonth(now)),
    end: toDateOnly(endOfMonth(now)),
  };
}

export type DashboardSummary = {
  balanceCents: number;
  incomePaidCents: number;
  expensePaidCents: number;
  /** Saldo projetado para o fim do mês (só eventos de CAIXA — ver decisão 39). */
  forecastCents: number;
};

/**
 * Resumo do topo. Saldo previsto = saldo atual
 *   + receitas pendentes do mês em CONTA
 *   − despesas pendentes do mês em CONTA (inclui parcelas em conta)
 *   − faturas não pagas com vencimento no mês.
 * Compras no cartão (account_id nulo) não entram direto — entram pela fatura,
 * evitando dupla contagem (decisão 39).
 */
export async function getSummary(): Promise<DashboardSummary> {
  const supabase = await createClient();
  const { start, end } = currentMonthRange();

  const [balances, monthly, pendingAccount, unpaidInvoices] = await Promise.all(
    [
      supabase.from("v_account_balances").select("balance_cents, is_archived"),
      supabase
        .from("v_monthly_summary")
        .select("income_paid_cents, expense_paid_cents")
        .eq("month", start)
        .maybeSingle(),
      supabase
        .from("v_entries")
        .select("type, amount_cents")
        .eq("status", "pending")
        .eq("affects_balance", true) // Fase 17 (decisão 56): histórico não entra no previsto
        .not("account_id", "is", null)
        .gte("date", start)
        .lte("date", end),
      supabase
        .from("v_invoice_totals")
        .select("total_cents, status, due_date")
        .in("status", ["open", "closed"])
        .gte("due_date", start)
        .lte("due_date", end),
    ],
  );

  const balanceCents = (balances.data ?? [])
    .filter((a) => !a.is_archived)
    .reduce((sum, a) => sum + (a.balance_cents ?? 0), 0);

  const incomePendingAccount = (pendingAccount.data ?? [])
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + (e.amount_cents ?? 0), 0);
  const expensePendingAccount = (pendingAccount.data ?? [])
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + (e.amount_cents ?? 0), 0);
  const unpaidInvoiceCents = (unpaidInvoices.data ?? []).reduce(
    (sum, i) => sum + (i.total_cents ?? 0),
    0,
  );

  return {
    balanceCents,
    incomePaidCents: monthly.data?.income_paid_cents ?? 0,
    expensePaidCents: monthly.data?.expense_paid_cents ?? 0,
    forecastCents:
      balanceCents +
      incomePendingAccount -
      expensePendingAccount -
      unpaidInvoiceCents,
  };
}

export type MonthlyPoint = {
  month: string; // "YYYY-MM-01"
  label: string; // "jul"
  incomeCents: number;
  expenseCents: number;
};

/** Últimos `months` meses (competência) para o gráfico receitas × despesas. */
export async function getMonthlySeries(months = 6): Promise<MonthlyPoint[]> {
  const supabase = await createClient();
  const from = toDateOnly(startOfMonth(subMonths(new Date(), months - 1)));

  const { data } = await supabase
    .from("v_monthly_summary")
    .select("month, income_paid_cents, expense_paid_cents")
    .gte("month", from)
    .order("month", { ascending: true });

  const byMonth = new Map(
    (data ?? []).map((row) => [
      row.month,
      {
        income: row.income_paid_cents ?? 0,
        expense: row.expense_paid_cents ?? 0,
      },
    ]),
  );

  // Preenche meses sem movimento com zero (série contínua).
  const points: MonthlyPoint[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const date = startOfMonth(subMonths(new Date(), i));
    const iso = toDateOnly(date);
    const found = byMonth.get(iso);
    points.push({
      month: iso,
      label: format(date, "LLL", { locale: ptBR }),
      incomeCents: found?.income ?? 0,
      expenseCents: found?.expense ?? 0,
    });
  }
  return points;
}

export type CategorySlice = {
  categoryId: string;
  name: string;
  color: string;
  amountCents: number;
};

/**
 * Gasto por categoria no mês atual (competência). Exclui pagamentos de fatura
 * (as compras já contam) — mesma regra da migration 0010.
 */
export async function getCategorySpending(): Promise<CategorySlice[]> {
  const supabase = await createClient();
  const { start, end } = currentMonthRange();

  const [entries, invoices, categories] = await Promise.all([
    supabase
      .from("v_entries")
      .select("transaction_id, category_id, amount_cents")
      .eq("type", "expense")
      .neq("status", "cancelled")
      .gte("date", start)
      .lte("date", end),
    supabase
      .from("credit_card_invoices")
      .select("payment_transaction_id")
      .not("payment_transaction_id", "is", null),
    supabase.from("categories").select("id, name, color"),
  ]);

  const paymentIds = new Set(
    (invoices.data ?? []).map((i) => i.payment_transaction_id),
  );
  const categoryById = new Map((categories.data ?? []).map((c) => [c.id, c]));

  const totals = new Map<string, number>();
  for (const entry of entries.data ?? []) {
    if (!entry.category_id) continue;
    if (entry.transaction_id && paymentIds.has(entry.transaction_id)) continue;
    totals.set(
      entry.category_id,
      (totals.get(entry.category_id) ?? 0) + (entry.amount_cents ?? 0),
    );
  }

  return [...totals.entries()]
    .map(([categoryId, amountCents]) => {
      const category = categoryById.get(categoryId);
      return {
        categoryId,
        name: category?.name ?? "Sem categoria",
        color: category?.color ?? "#71717a",
        amountCents,
      };
    })
    .sort((a, b) => b.amountCents - a.amountCents);
}

export type RecentEntry = {
  id: string;
  description: string;
  date: string;
  amountCents: number;
  type: "income" | "expense" | "transfer";
  direction: "in" | "out" | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
};

/**
 * Últimas movimentações (não canceladas) para o feed do dashboard. Limitado
 * a `date <= hoje`: `date` é a competência/vencimento, então sem esse corte
 * as parcelas AGENDADAS para meses/anos à frente (data futura) apareceriam no
 * topo de "As mais recentes" — o que não é uma movimentação recente, é uma
 * previsão. O dashboard tem, assim, sua própria ordenação (sempre o histórico
 * mais recente até hoje), independente do que estiver ordenado em /transacoes.
 */
export async function getRecentEntries(limit = 8): Promise<RecentEntry[]> {
  const supabase = await createClient();

  const [entries, categories] = await Promise.all([
    supabase
      .from("v_entries")
      .select(
        "id, description, date, amount_cents, type, transfer_direction, category_id",
      )
      .neq("status", "cancelled")
      .lte("date", todayISO())
      .order("date", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit),
    supabase.from("categories").select("id, name, color, icon"),
  ]);

  const categoryById = new Map((categories.data ?? []).map((c) => [c.id, c]));

  return (entries.data ?? []).map((entry) => {
    const category = entry.category_id
      ? categoryById.get(entry.category_id)
      : undefined;
    return {
      id: entry.id ?? "",
      description: entry.description ?? "",
      date: entry.date ?? "",
      amountCents: entry.amount_cents ?? 0,
      type: entry.type ?? "expense",
      direction: entry.transfer_direction,
      categoryName: category?.name ?? null,
      categoryColor: category?.color ?? null,
      categoryIcon: category?.icon ?? null,
    };
  });
}
