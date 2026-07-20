import type { Tables } from "@/types/database";

export type Loan = Tables<"loans">;

/**
 * Empréstimo + progresso DERIVADO das parcelas da compra-mãe (`getLoans`
 * agrega `transaction_installments` por `parent_transaction_id`) — nada
 * armazenado, zero drift (espírito da D2). `paidCount === installmentsTotal`
 * ⇔ quitado.
 */
export type LoanWithProgress = Loan & {
  paidCount: number;
  paidCents: number;
  remainingCents: number;
  /** Próxima parcela pendente (menor vencimento), ou null se quitado. */
  nextInstallment: {
    id: string;
    dueDate: string;
    amountCents: number;
  } | null;
};
