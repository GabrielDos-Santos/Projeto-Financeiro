import { createClient } from "@/lib/supabase/server";
import type { Entry } from "@/features/transactions/types";
import type {
  CardWithLimit,
  CreditCard,
  InvoicePayment,
  InvoiceWithPayments,
} from "./types";

/**
 * Cartões + limite disponível e total da fatura aberta.
 * Limite disponível = limite − Σ(faturas open/closed não pagas); espelha
 * `get_card_available_limit()` mas computado a partir de `v_invoice_totals`
 * (uma query só, em vez de um RPC por cartão).
 */
export async function getCardsWithLimits(): Promise<CardWithLimit[]> {
  const supabase = await createClient();

  const [cardsResult, totalsResult] = await Promise.all([
    supabase
      .from("credit_cards")
      .select("*")
      .order("is_archived", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("v_invoice_totals")
      .select("credit_card_id, status, total_cents, paid_cents"),
  ]);

  if (cardsResult.error) throw new Error("Falha ao carregar os cartões.");
  const totals = totalsResult.data ?? [];

  return cardsResult.data.map((card) => {
    const cardTotals = totals.filter((t) => t.credit_card_id === card.id);
    // Compromete o RESTANTE (total − já pago) das faturas não pagas — um
    // pagamento parcial libera a parte paga na hora (espelha get_card_available_limit).
    const committed = cardTotals
      .filter((t) => t.status === "open" || t.status === "closed")
      .reduce(
        (sum, t) =>
          sum + Math.max(0, (t.total_cents ?? 0) - (t.paid_cents ?? 0)),
        0,
      );
    const openInvoiceCents = cardTotals
      .filter((t) => t.status === "open")
      .reduce((sum, t) => sum + (t.total_cents ?? 0), 0);
    return {
      ...card,
      availableCents: card.limit_cents - committed,
      openInvoiceCents,
    };
  });
}

export async function getCard(id: string): Promise<CreditCard | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("credit_cards")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

/**
 * Faturas do cartão (com total e `paid_cents` calculados), da mais recente para
 * a mais antiga, cada uma com a lista de pagamentos (parciais + o que quitou) e
 * o `paymentIsHistorical` legado (decisão 57). Tudo em 3 queries (faturas →
 * pagamentos → transações), sem N+1.
 */
export async function getCardInvoices(
  cardId: string,
): Promise<InvoiceWithPayments[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_invoice_totals")
    .select("*")
    .eq("credit_card_id", cardId)
    .order("reference_month", { ascending: false });
  if (error) throw new Error("Falha ao carregar as faturas.");

  const invoiceIds = data
    .map((invoice) => invoice.invoice_id)
    .filter((id): id is string => id != null);

  const paymentRows =
    invoiceIds.length > 0
      ? ((
          await supabase
            .from("credit_card_invoice_payments")
            .select("id, invoice_id, amount_cents, transaction_id")
            .in("invoice_id", invoiceIds)
            .order("created_at", { ascending: false })
        ).data ?? [])
      : [];

  // Datas/afeta-saldo das despesas de pagamento: parciais (link) + legadas
  // (payment_transaction_id de faturas quitadas antes da 0019).
  const txnIds = [
    ...new Set([
      ...paymentRows.map((p) => p.transaction_id),
      ...data
        .map((invoice) => invoice.payment_transaction_id)
        .filter((id): id is string => id != null),
    ]),
  ];
  const txnById = new Map<
    string,
    { date: string | null; affectsBalance: boolean }
  >();
  if (txnIds.length > 0) {
    const { data: txns } = await supabase
      .from("transactions")
      .select("id, date, affects_balance")
      .in("id", txnIds);
    for (const t of txns ?? []) {
      txnById.set(t.id, { date: t.date, affectsBalance: t.affects_balance });
    }
  }

  const paymentsByInvoice = new Map<string, InvoicePayment[]>();
  for (const p of paymentRows) {
    const txn = txnById.get(p.transaction_id);
    const list = paymentsByInvoice.get(p.invoice_id) ?? [];
    list.push({
      id: p.id,
      amountCents: p.amount_cents,
      date: txn?.date ?? "",
      isHistorical: txn ? !txn.affectsBalance : false,
    });
    paymentsByInvoice.set(p.invoice_id, list);
  }

  return data.map((invoice) => ({
    ...invoice,
    paymentIsHistorical: invoice.payment_transaction_id
      ? txnById.get(invoice.payment_transaction_id)?.affectsBalance === false
      : false,
    payments: invoice.invoice_id
      ? (paymentsByInvoice.get(invoice.invoice_id) ?? [])
      : [],
  }));
}

/** Itens de uma fatura (compras à vista + parcelas), da view canônica. */
export async function getInvoiceItems(invoiceId: string): Promise<Entry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_entries")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("date", { ascending: true });
  if (error) throw new Error("Falha ao carregar os itens da fatura.");
  return data;
}
