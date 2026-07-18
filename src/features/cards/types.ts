import type { Tables } from "@/types/database";

export type CreditCard = Tables<"credit_cards">;

/** Linha da view `v_invoice_totals` — fatura + total calculado. */
export type InvoiceTotals = Tables<"v_invoice_totals">;

/**
 * Fatura + se o pagamento foi histórico (Fase 17, decisão 57) — derivado por
 * fora (join com `transactions.affects_balance` via `payment_transaction_id`),
 * sem coluna nova em `credit_card_invoices`.
 */
export type InvoiceWithHistory = InvoiceTotals & {
  paymentIsHistorical: boolean;
};

/** Cartão + limite disponível e total da fatura aberta (derivados no RSC). */
export type CardWithLimit = CreditCard & {
  availableCents: number;
  openInvoiceCents: number;
};

export const INVOICE_STATUS_LABELS: Record<
  NonNullable<InvoiceTotals["status"]>,
  string
> = {
  open: "Aberta",
  closed: "Fechada",
  paid: "Paga",
};

/**
 * Melhor dia de compra = dia seguinte ao fechamento (maior prazo até o
 * vencimento). Derivado, nunca armazenado (ARQUITETURA.md §4.2).
 */
export function bestPurchaseDay(closingDay: number): number {
  return closingDay >= 28 ? 1 : closingDay + 1;
}
