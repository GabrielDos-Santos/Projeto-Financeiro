import type { Tables } from "@/types/database";

export type Transaction = Tables<"transactions">;

/** Linha da view `v_entries` — camada canônica de leitura (D4). */
export type Entry = Tables<"v_entries">;

export const TRANSACTION_TYPE_LABELS: Record<Transaction["type"], string> = {
  income: "Receita",
  expense: "Despesa",
  transfer: "Transferência",
};

export const TRANSACTION_STATUS_LABELS: Record<Transaction["status"], string> =
  {
    paid: "Pago",
    pending: "Pendente",
    cancelled: "Cancelada",
  };

/** Opções para selects de formulário/filtros (derivadas no RSC da página). */
export type AccountOption = { id: string; name: string };
export type CategoryOption = {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string | null;
  icon: string | null;
};
export type CardOption = {
  id: string;
  name: string;
  closingDay: number;
  dueDay: number;
  /** `credit_cards.invoice_name_by_due_month` — opcional: só o wizard de
   * import precisa disso pra alinhar o seletor de mês ao rótulo exibido. */
  invoiceNameByDueMonth?: boolean;
};

/**
 * Valor com sinal para exibição: despesa e perna de saída são negativas;
 * receita e perna de entrada, positivas. (No banco `amount_cents` é sempre > 0.)
 */
export function signedAmountCents(entry: Entry): number {
  const amount = entry.amount_cents ?? 0;
  if (entry.type === "transfer") {
    return entry.transfer_direction === "out" ? -amount : amount;
  }
  return entry.type === "expense" ? -amount : amount;
}
