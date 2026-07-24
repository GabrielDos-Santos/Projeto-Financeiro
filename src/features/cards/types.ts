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

/** Restante a pagar de uma fatura = total − já pago (nunca negativo). */
export function invoiceRemainingCents(invoice: InvoiceTotals): number {
  return Math.max(0, (invoice.total_cents ?? 0) - (invoice.paid_cents ?? 0));
}

/** Fatura com algum pagamento, mas ainda não quitada por inteiro. */
export function isPartiallyPaid(invoice: InvoiceTotals): boolean {
  return (
    invoice.status !== "paid" &&
    (invoice.paid_cents ?? 0) > 0 &&
    (invoice.paid_cents ?? 0) < (invoice.total_cents ?? 0)
  );
}

/**
 * Um pagamento parcial da fatura (linha de `credit_card_invoice_payments`
 * enriquecida com dados da transação de despesa que ela representa).
 */
export type InvoicePayment = {
  id: string;
  amountCents: number;
  date: string;
  isHistorical: boolean;
};

/** Fatura + histórico legado + a lista de pagamentos (parciais/total) feitos. */
export type InvoiceWithPayments = InvoiceWithHistory & {
  payments: InvoicePayment[];
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
