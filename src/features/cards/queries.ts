import { createClient } from "@/lib/supabase/server";
import type { Entry } from "@/features/transactions/types";
import type { CardWithLimit, CreditCard, InvoiceTotals } from "./types";

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
      .select("credit_card_id, status, total_cents"),
  ]);

  if (cardsResult.error) throw new Error("Falha ao carregar os cartões.");
  const totals = totalsResult.data ?? [];

  return cardsResult.data.map((card) => {
    const cardTotals = totals.filter((t) => t.credit_card_id === card.id);
    const committed = cardTotals
      .filter((t) => t.status === "open" || t.status === "closed")
      .reduce((sum, t) => sum + (t.total_cents ?? 0), 0);
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

/** Faturas do cartão (com total calculado), da mais recente para a mais antiga. */
export async function getCardInvoices(
  cardId: string,
): Promise<InvoiceTotals[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_invoice_totals")
    .select("*")
    .eq("credit_card_id", cardId)
    .order("reference_month", { ascending: false });
  if (error) throw new Error("Falha ao carregar as faturas.");
  return data;
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
