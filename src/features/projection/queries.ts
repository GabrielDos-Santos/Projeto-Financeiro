import { addMonths, endOfMonth, startOfMonth } from "date-fns";

import { createClient } from "@/lib/supabase/server";
import { toDateOnly, todayISO } from "@/lib/dates";
import { computeInvoicePeriod } from "@/services/invoices";
import { nextOccurrences } from "@/services/recurrence";
import type { ProjectionFlow } from "@/services/projection";
import type { ProjectionInputs, SimulationCardOption } from "./types";

/**
 * Teto de ocorrências geradas por regra recorrente (uma diária em 12 meses dá
 * ~365). Corta cauda patológica sem afetar caso real.
 */
const MAX_OCCURRENCES_PER_RULE = 400;

const EMPTY: ProjectionInputs = {
  startingBalanceCents: 0,
  flows: [],
  cards: [],
  todayISO: todayISO(),
  hasRecurring: false,
};

/**
 * Insumos da projeção (Fase 20) — tudo convertido em eventos de CAIXA.
 *
 * ⚠️ `user_id` explícito em toda query (decisão 96): a policy estendida da
 * Fase 16 faz o admin da casa LER as linhas dos membros — sem esses filtros a
 * projeção "pessoal" dele somaria as contas e faturas dos outros.
 *
 * Anti-dupla-contagem (decisão c/d):
 *  - item de cartão NUNCA entra sozinho: cartão só entra pelo total da fatura
 *    no `due_date` (estende as decisões 5/34 para o futuro);
 *  - ocorrência recorrente VIRTUAL é descartada se o job diário já
 *    materializou a mesma regra naquela data.
 */
export async function getProjectionInputs(
  months: number,
): Promise<ProjectionInputs> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY;

  const today = todayISO();
  const horizonEnd = toDateOnly(
    endOfMonth(addMonths(startOfMonth(new Date()), Math.max(0, months) - 1)),
  );

  const [
    balances,
    pending,
    invoices,
    recurring,
    cards,
    loans,
    materialized,
    excluded,
  ] = await Promise.all([
      supabase
        .from("v_account_balances")
        .select("balance_cents, is_archived")
        .eq("user_id", user.id),
      // Pendentes FORA de cartão (o cartão entra pela fatura).
      supabase
        .from("v_entries")
        .select(
          "id, date, description, amount_cents, type, transfer_direction, entry_kind, transaction_id, recurring_id",
        )
        .eq("user_id", user.id)
        .eq("status", "pending")
        .eq("affects_balance", true) // histórico não move caixa (decisão 56)
        .is("credit_card_id", null)
        .lte("date", horizonEnd),
      supabase
        .from("v_invoice_totals")
        .select("invoice_id, credit_card_id, due_date, total_cents, status")
        .eq("user_id", user.id)
        .in("status", ["open", "closed"])
        .lte("due_date", horizonEnd),
      supabase
        .from("recurring_transactions")
        .select(
          "id, description, amount_cents, type, frequency, interval_count, start_date, end_date, next_run_date, credit_card_id",
        )
        .eq("user_id", user.id)
        .eq("is_active", true)
        .eq("exclude_from_projection", false),
      supabase
        .from("credit_cards")
        .select("id, name, closing_day, due_day")
        .eq("user_id", user.id)
        .eq("is_archived", false),
      supabase
        .from("loans")
        .select("parent_transaction_id, name")
        .eq("user_id", user.id),
      // Recorrências JÁ materializadas no horizonte (dedup da expansão virtual).
      supabase
        .from("v_entries")
        .select("recurring_id, date")
        .eq("user_id", user.id)
        .not("recurring_id", "is", null)
        .gte("date", today)
        .lte("date", horizonEnd),
      // Regras marcadas "não incluir na projeção" (migration 0018). SEM filtro
      // de `is_active`: uma regra pausada pode ter deixado pendentes
      // materializados, e eles também precisam sumir da projeção.
      supabase
        .from("recurring_transactions")
        .select("id")
        .eq("user_id", user.id)
        .eq("exclude_from_projection", true),
    ]);

  const startingBalanceCents = (balances.data ?? [])
    .filter((a) => !a.is_archived)
    .reduce((sum, a) => sum + (a.balance_cents ?? 0), 0);

  const cardOptions: SimulationCardOption[] = (cards.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    closingDay: c.closing_day,
    dueDay: c.due_day,
  }));
  const cardById = new Map(cardOptions.map((c) => [c.id, c]));
  const loanByParent = new Map(
    (loans.data ?? []).map((l) => [l.parent_transaction_id, l.name]),
  );

  // Regras fora da projeção: some a expansão virtual (já filtrada na query)
  // E os lançamentos que a regra JÁ materializou — senão o checkbox só
  // esconderia o futuro distante, e a despesa reapareceria assim que o job
  // diário a materializasse.
  const excludedRuleIds = new Set((excluded.data ?? []).map((r) => r.id));

  const flows: ProjectionFlow[] = [];

  // 1) Pendentes em conta: transações avulsas, parcelas e parcelas de empréstimo.
  for (const entry of pending.data ?? []) {
    const magnitude = entry.amount_cents ?? 0;
    if (!magnitude || !entry.date) continue;
    if (entry.recurring_id && excludedRuleIds.has(entry.recurring_id)) continue;

    // Sinal: transferência vem pela direção; o resto, pelo tipo.
    let signed: number;
    if (entry.type === "transfer") {
      signed = entry.transfer_direction === "in" ? magnitude : -magnitude;
    } else {
      signed = entry.type === "income" ? magnitude : -magnitude;
    }

    const description = entry.description ?? "Lançamento";
    const loanName = entry.transaction_id
      ? loanByParent.get(entry.transaction_id)
      : undefined;

    if (loanName) {
      flows.push({
        dateISO: entry.date,
        amountCents: signed,
        source: "loan",
        label: description,
        groupId: `loan:${entry.transaction_id}`,
        groupLabel: loanName,
      });
      continue;
    }

    const isInstallment = entry.entry_kind === "installment";
    flows.push({
      dateISO: entry.date,
      amountCents: signed,
      source: isInstallment ? "installment" : "pending",
      label: description,
      // Parcelas da mesma compra viram UMA linha; avulsos ficam soltos.
      groupId:
        isInstallment && entry.transaction_id
          ? `installment:${entry.transaction_id}`
          : `entry:${entry.id}`,
      groupLabel: description,
    });
  }

  // 2) Faturas não pagas: saem do caixa inteiras, no vencimento.
  for (const invoice of invoices.data ?? []) {
    const total = invoice.total_cents ?? 0;
    if (total <= 0 || !invoice.due_date || !invoice.credit_card_id) continue;
    const card = cardById.get(invoice.credit_card_id);
    flows.push({
      dateISO: invoice.due_date,
      amountCents: -total,
      source: "invoice",
      label: `Fatura ${card?.name ?? "cartão"}`,
      groupId: `card:${invoice.credit_card_id}`,
      groupLabel: `Fatura ${card?.name ?? "cartão"}`,
    });
  }

  // 3) Recorrências ainda NÃO materializadas — expansão virtual.
  const alreadyMaterialized = new Set(
    (materialized.data ?? []).map((e) => `${e.recurring_id}|${e.date}`),
  );

  for (const rule of recurring.data ?? []) {
    // Âncora da expansão: nunca antes de hoje. Ocorrência vencida e não
    // materializada é falha do job (resolvida pelo "Gerar agora"), não
    // compromisso futuro — contá-la inflaria o mês corrente.
    const from = rule.next_run_date > today ? rule.next_run_date : today;
    const occurrences = nextOccurrences(
      rule.start_date,
      rule.frequency,
      rule.interval_count,
      rule.end_date,
      from,
      MAX_OCCURRENCES_PER_RULE,
    );

    const card = rule.credit_card_id
      ? cardById.get(rule.credit_card_id)
      : undefined;
    const signed =
      rule.type === "income" ? rule.amount_cents : -rule.amount_cents;

    for (const occurrence of occurrences) {
      if (occurrence > horizonEnd) break;
      if (alreadyMaterialized.has(`${rule.id}|${occurrence}`)) continue;

      // Regra que lança no cartão só pesa no caixa no vencimento da fatura.
      let dateISO = occurrence;
      if (card) {
        dateISO = computeInvoicePeriod(
          card.closingDay,
          card.dueDay,
          occurrence,
        ).dueDate;
        if (dateISO > horizonEnd) continue;
      }

      flows.push({
        dateISO,
        amountCents: signed,
        source: "recurring",
        label: rule.description,
        groupId: `recurring:${rule.id}`,
        groupLabel: rule.description,
      });
    }
  }

  return {
    startingBalanceCents,
    flows,
    cards: cardOptions,
    todayISO: today,
    hasRecurring: (recurring.data ?? []).length > 0,
  };
}
