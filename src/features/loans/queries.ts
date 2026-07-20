import { createClient } from "@/lib/supabase/server";
import type { Loan, LoanWithProgress } from "./types";

/**
 * Empréstimos do usuário + progresso DERIVADO das parcelas da compra-mãe
 * (nada armazenado — espírito da D2). Uma única query extra para todas as
 * parcelas de todos os empréstimos, agregada em memória (volume por usuário
 * é pequeno — mesmo racional de `getAccountsWithBalances`).
 */
export async function getLoans(): Promise<LoanWithProgress[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: loans, error } = await supabase
    .from("loans")
    .select("*")
    .eq("user_id", user.id)
    .order("contract_date", { ascending: false });
  if (error) throw new Error("Falha ao carregar os empréstimos.");
  if (!loans || loans.length === 0) return [];

  const parentIds = loans.map((loan: Loan) => loan.parent_transaction_id);
  const { data: installments, error: installmentsError } = await supabase
    .from("transaction_installments")
    .select("transaction_id, amount_cents, due_date, status, id")
    .in("transaction_id", parentIds)
    .order("due_date", { ascending: true });
  if (installmentsError) {
    throw new Error("Falha ao carregar as parcelas dos empréstimos.");
  }

  const byLoan = new Map<string, typeof installments>();
  for (const installment of installments ?? []) {
    const list = byLoan.get(installment.transaction_id) ?? [];
    list.push(installment);
    byLoan.set(installment.transaction_id, list);
  }

  return loans.map((loan: Loan) => {
    const rows = byLoan.get(loan.parent_transaction_id) ?? [];
    const paid = rows.filter((row) => row.status === "paid");
    const pending = rows.filter((row) => row.status !== "paid");
    const paidCents = paid.reduce((sum, row) => sum + row.amount_cents, 0);
    const remainingCents = pending.reduce(
      (sum, row) => sum + row.amount_cents,
      0,
    );
    const next = pending[0];

    return {
      ...loan,
      paidCount: paid.length,
      paidCents,
      remainingCents,
      nextInstallment: next
        ? { id: next.id, dueDate: next.due_date, amountCents: next.amount_cents }
        : null,
    };
  });
}
