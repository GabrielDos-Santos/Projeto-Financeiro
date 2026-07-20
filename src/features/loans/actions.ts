"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { todayISO } from "@/lib/dates";
import { buildInstallmentPlan } from "@/services/installments";
import { maybeBudgetAlert } from "@/features/budgets/alert";
import type { BudgetAlert } from "@/features/budgets/types";
import { setInstallmentStatus } from "@/features/transactions/actions";
import { loanFormSchema, loanIdSchema } from "./schemas";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function revalidate() {
  revalidatePath("/emprestimos");
  revalidatePath("/transacoes");
  revalidatePath("/dashboard");
}

/**
 * Cria um empréstimo: `loans` é metadado de contrato apontando para duas
 * pontas 100% reusadas (docs/ARQUITETURA-EXPANSAO-EMPRESTIMOS.md, decisão
 * 97) — desembolso opcional (1 transação `income`) + dívida (compra-mãe +
 * parcelas via `buildInstallmentPlan()`, mesmo motor da Fase 5). Gravação
 * atômica com rollback em cascata, mesmo padrão de
 * `createInstallmentBackfillPurchase` (decisão 62).
 */
export async function createLoan(
  input: unknown,
): Promise<ActionResult<{ alert: BudgetAlert | null }>> {
  const parsed = loanFormSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const data = parsed.data;
  // Empréstimo em andamento (paidCount > 0): o principal já estava refletido
  // no saldo inicial — o desembolso nasce histórico, não credita de novo
  // (mesmo racional da decisão 56/62).
  const disbursementHistorical = data.paidCount > 0;

  let disbursementId: string | null = null;
  if (data.creditToAccount) {
    const paidAt = new Date(`${data.contractDate}T12:00:00`).toISOString();
    const { data: disbursement, error: disbursementError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        type: "income",
        status: "paid",
        description: `Empréstimo recebido — ${data.name}`,
        amount_cents: data.principalCents,
        date: data.contractDate,
        paid_at: paidAt,
        account_id: data.disbursementAccountId!,
        category_id: data.disbursementCategoryId!,
        affects_balance: !disbursementHistorical,
      })
      .select("id")
      .single();
    if (disbursementError || !disbursement) {
      return fail("Não foi possível registrar o valor recebido. Tente novamente.");
    }
    disbursementId = disbursement.id;
  }

  const plan = buildInstallmentPlan(
    data.totalCents,
    data.installmentsTotal,
    data.firstDueDate,
  );

  // Mãe fora de v_entries (D4) — affects_balance irrelevante para saldo,
  // fica false só para marcar a origem histórica (decisão 62).
  const { data: parent, error: parentError } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      type: "expense",
      status: "pending",
      description: data.name,
      notes: data.notes || null,
      amount_cents: data.totalCents,
      date: data.contractDate,
      account_id: data.installmentAccountId,
      category_id: data.expenseCategoryId,
      is_installment_parent: true,
      installments_total: data.installmentsTotal,
      affects_balance: false,
    })
    .select("id")
    .single();

  if (parentError || !parent) {
    if (disbursementId) {
      await supabase.from("transactions").delete().eq("id", disbursementId);
    }
    return fail("Não foi possível criar as parcelas do empréstimo. Tente novamente.");
  }

  const { error: installmentsError } = await supabase
    .from("transaction_installments")
    .insert(
      plan.map((item) => {
        const isPaid = item.number <= data.paidCount;
        return {
          transaction_id: parent.id,
          user_id: user.id,
          installment_number: item.number,
          amount_cents: item.amountCents,
          due_date: item.dueDate,
          status: (isPaid ? "paid" : "pending") as "paid" | "pending",
          paid_at: isPaid
            ? new Date(`${item.dueDate}T12:00:00`).toISOString()
            : null,
          affects_balance: !isPaid,
        };
      }),
    );

  if (installmentsError) {
    await supabase.from("transactions").delete().eq("id", parent.id);
    if (disbursementId) {
      await supabase.from("transactions").delete().eq("id", disbursementId);
    }
    return fail("Não foi possível criar as parcelas do empréstimo. Tente novamente.");
  }

  const { error: loanError } = await supabase.from("loans").insert({
    user_id: user.id,
    name: data.name,
    lender: data.lender || null,
    principal_cents: data.principalCents,
    total_cents: data.totalCents,
    installments_total: data.installmentsTotal,
    interest_rate: data.interestRate ?? null,
    contract_date: data.contractDate,
    notes: data.notes || null,
    disbursement_transaction_id: disbursementId,
    parent_transaction_id: parent.id,
  });

  if (loanError) {
    // Cascade da FK já leva as parcelas junto.
    await supabase.from("transactions").delete().eq("id", parent.id);
    if (disbursementId) {
      await supabase.from("transactions").delete().eq("id", disbursementId);
    }
    return fail("Não foi possível salvar o empréstimo. Tente novamente.");
  }

  revalidate();

  // Alerta só se alguma parcela cair no mês corrente (decisão 63) — sem
  // rajada de alertas de meses passados/futuros do plano inteiro.
  const currentMonth = todayISO().slice(0, 7);
  const touchedThisMonth = plan.some(
    (item) => item.dueDate.slice(0, 7) === currentMonth,
  );
  const alert = touchedThisMonth
    ? await maybeBudgetAlert(supabase, user.id, data.expenseCategoryId, todayISO())
    : null;

  return ok({ alert });
}

/**
 * Exclui o empréstimo por inteiro: a compra-mãe (cascade leva as parcelas E
 * o próprio `loans` — FK `parent_transaction_id on delete cascade`) e,
 * se existir, o desembolso — o par inteiro some, saldos voltam (decisão
 * 100). A UI avisa o alcance antes de confirmar.
 */
export async function deleteLoan(input: unknown): Promise<ActionResult<null>> {
  const parsed = loanIdSchema.safeParse(input);
  if (!parsed.success) return fail("Empréstimo inválido.");

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { data: loan } = await supabase
    .from("loans")
    .select("parent_transaction_id, disbursement_transaction_id")
    .eq("id", parsed.data)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!loan) return fail("Empréstimo não encontrado.");

  const { error, count } = await supabase
    .from("transactions")
    .delete({ count: "exact" })
    .eq("id", loan.parent_transaction_id);
  if (error) return fail("Não foi possível excluir o empréstimo. Tente novamente.");
  if (count === 0) return fail("Empréstimo não encontrado.");

  if (loan.disbursement_transaction_id) {
    await supabase
      .from("transactions")
      .delete()
      .eq("id", loan.disbursement_transaction_id);
  }

  revalidate();
  return ok(null);
}

/**
 * Marca a próxima parcela de um empréstimo como paga — wrapper fino sobre
 * `setInstallmentStatus` (já usado em `/transacoes`, decisão 33): a parcela
 * do empréstimo é uma `transaction_installments` comum, nada de status
 * próprio. Só existe para revalidar `/emprestimos` também (o card mostra
 * progresso derivado das parcelas).
 */
export async function markLoanInstallmentPaid(
  installmentId: unknown,
): Promise<ActionResult<null>> {
  const result = await setInstallmentStatus(installmentId, "paid");
  if (result.ok) revalidatePath("/emprestimos");
  return result;
}
