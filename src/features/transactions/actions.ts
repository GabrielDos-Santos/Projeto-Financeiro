"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { addMonths } from "date-fns";

import { parseDateOnly, todayISO, toDateOnly } from "@/lib/dates";
import { buildInstallmentPlan } from "@/services/installments";
import { splitInstallments } from "@/lib/money";
import { maybeBudgetAlert } from "@/features/budgets/alert";
import type { BudgetAlert } from "@/features/budgets/types";
import {
  attachmentIdSchema,
  attachmentMetaSchema,
  cardInstallmentPurchaseSchema,
  cardPurchaseSchema,
  entryFormSchema,
  entryStatusSchema,
  installmentBackfillAccountSchema,
  installmentBackfillCardSchema,
  installmentIdSchema,
  installmentPurchaseSchema,
  transactionIdSchema,
  transferFormSchema,
  transferGroupIdSchema,
} from "./schemas";

const FK_RESTRICT_VIOLATION = "23503";

function paidAtFor(status: "paid" | "pending" | "cancelled"): string | null {
  return status === "paid" ? new Date().toISOString() : null;
}

function revalidate() {
  revalidatePath("/transacoes");
  revalidatePath("/contas"); // saldos derivados mudam junto (D2)
}

function revalidateWithCard(cardId: string) {
  revalidate();
  revalidatePath("/cartoes"); // limite disponível e fatura aberta mudam
  revalidatePath(`/cartoes/${cardId}`);
}

export async function createTransaction(
  input: unknown,
): Promise<ActionResult<{ alert: BudgetAlert | null }>> {
  const parsed = entryFormSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: parsed.data.type,
    status: parsed.data.status,
    description: parsed.data.description,
    notes: parsed.data.notes || null,
    amount_cents: parsed.data.amountCents,
    date: parsed.data.date,
    paid_at: paidAtFor(parsed.data.status),
    account_id: parsed.data.accountId,
    category_id: parsed.data.categoryId,
    affects_balance: parsed.data.affectsBalance,
  });

  if (error) {
    return fail("Não foi possível criar o lançamento. Tente novamente.");
  }

  revalidate();
  const alert =
    parsed.data.type === "expense"
      ? await maybeBudgetAlert(
          supabase,
          user.id,
          parsed.data.categoryId,
          parsed.data.date,
        )
      : null;
  return ok({ alert });
}

export async function updateTransaction(
  id: unknown,
  input: unknown,
): Promise<ActionResult<null>> {
  const parsedId = transactionIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Lançamento inválido.");

  const parsed = entryFormSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  // Guardas: esta action só edita lançamentos simples — nunca uma perna de
  // transferência (fluxo próprio) nem uma compra-mãe parcelada (Fase 5).
  const { error, count } = await supabase
    .from("transactions")
    .update(
      {
        type: parsed.data.type,
        status: parsed.data.status,
        description: parsed.data.description,
        notes: parsed.data.notes || null,
        amount_cents: parsed.data.amountCents,
        date: parsed.data.date,
        paid_at: paidAtFor(parsed.data.status),
        account_id: parsed.data.accountId,
        category_id: parsed.data.categoryId,
        affects_balance: parsed.data.affectsBalance,
      },
      { count: "exact" },
    )
    .eq("id", parsedId.data)
    .is("transfer_group_id", null)
    .eq("is_installment_parent", false);

  if (error) {
    return fail("Não foi possível salvar o lançamento. Tente novamente.");
  }
  if (count === 0) return fail("Lançamento não encontrado.");

  revalidate();
  return ok(null);
}

export async function createInstallmentPurchase(
  input: unknown,
): Promise<ActionResult<{ alert: BudgetAlert | null }>> {
  const parsed = installmentPurchaseSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const plan = buildInstallmentPlan(
    parsed.data.amountCents,
    parsed.data.installmentsTotal,
    parsed.data.firstDueDate,
  );

  // Compra-mãe (valor TOTAL; fora de v_entries — D4). O status dela não move
  // saldo: quem move é cada parcela paga.
  const { data: parent, error: parentError } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      type: "expense",
      status: "pending",
      description: parsed.data.description,
      notes: parsed.data.notes || null,
      amount_cents: parsed.data.amountCents,
      date: parsed.data.date,
      account_id: parsed.data.accountId,
      category_id: parsed.data.categoryId,
      is_installment_parent: true,
      installments_total: parsed.data.installmentsTotal,
    })
    .select("id")
    .single();

  if (parentError || !parent) {
    return fail("Não foi possível criar a compra parcelada. Tente novamente.");
  }

  const { error: installmentsError } = await supabase
    .from("transaction_installments")
    .insert(
      plan.map((item) => ({
        transaction_id: parent.id,
        user_id: user.id,
        installment_number: item.number,
        amount_cents: item.amountCents,
        due_date: item.dueDate,
        status: "pending" as const,
      })),
    );

  if (installmentsError) {
    // Rollback: sem as parcelas a mãe ficaria invisível (fora de v_entries).
    await supabase.from("transactions").delete().eq("id", parent.id);
    return fail("Não foi possível criar as parcelas. Tente novamente.");
  }

  revalidate();
  // Só a 1ª parcela pode cair no mês corrente; orçamento é por competência
  // (mês do vencimento de cada parcela) — as demais serão checadas quando
  // vencerem (a query de alerta roda de novo ao criar/editar cada mês).
  const alert = await maybeBudgetAlert(
    supabase,
    user.id,
    parsed.data.categoryId,
    plan[0]!.dueDate,
  );
  return ok({ alert });
}

export async function createCardPurchase(
  input: unknown,
): Promise<ActionResult<{ alert: BudgetAlert | null }>> {
  const parsed = cardPurchaseSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  // Fatura da competência da compra (upsert idempotente — decisão Fase 2).
  const { data: invoiceId, error: invoiceError } = await supabase.rpc(
    "get_or_create_invoice",
    {
      p_credit_card_id: parsed.data.creditCardId,
      p_purchase_date: parsed.data.date,
    },
  );
  if (invoiceError || !invoiceId) {
    return fail("Não foi possível abrir a fatura do cartão. Tente novamente.");
  }

  // Compra no cartão: expense + credit_card_id + invoice_id, sem conta (D5).
  // Nasce pendente; o pagamento da fatura propaga `paid`.
  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: "expense",
    status: "pending",
    description: parsed.data.description,
    notes: parsed.data.notes || null,
    amount_cents: parsed.data.amountCents,
    date: parsed.data.date,
    credit_card_id: parsed.data.creditCardId,
    invoice_id: invoiceId,
    category_id: parsed.data.categoryId,
  });

  if (error) {
    return fail("Não foi possível lançar a compra. Tente novamente.");
  }

  revalidateWithCard(parsed.data.creditCardId);
  const alert = await maybeBudgetAlert(
    supabase,
    user.id,
    parsed.data.categoryId,
    parsed.data.date,
  );
  return ok({ alert });
}

export async function createCardInstallmentPurchase(
  input: unknown,
): Promise<ActionResult<{ alert: BudgetAlert | null }>> {
  const parsed = cardInstallmentPurchaseSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const amounts = splitInstallments(
    parsed.data.amountCents,
    parsed.data.installmentsTotal,
  );
  const purchaseDate = parseDateOnly(parsed.data.date);

  // Cada parcela cai na fatura do seu mês (compra + k meses). Abre/reaproveita
  // todas as faturas necessárias e lê a data de vencimento de cada uma.
  const monthDates = amounts.map((_, k) =>
    toDateOnly(addMonths(purchaseDate, k)),
  );
  const invoiceIds: string[] = [];
  for (const monthDate of monthDates) {
    const { data: invoiceId, error: invoiceError } = await supabase.rpc(
      "get_or_create_invoice",
      {
        p_credit_card_id: parsed.data.creditCardId,
        p_purchase_date: monthDate,
      },
    );
    if (invoiceError || !invoiceId) {
      return fail(
        "Não foi possível abrir as faturas do cartão. Tente de novo.",
      );
    }
    invoiceIds.push(invoiceId);
  }

  const { data: invoices, error: invoicesError } = await supabase
    .from("credit_card_invoices")
    .select("id, due_date")
    .in("id", invoiceIds);
  if (invoicesError || !invoices) {
    return fail("Não foi possível ler as faturas do cartão. Tente novamente.");
  }
  const dueDateById = new Map(invoices.map((inv) => [inv.id, inv.due_date]));

  // Compra-mãe: na fatura do mês da compra (1ª parcela).
  const { data: parent, error: parentError } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      type: "expense",
      status: "pending",
      description: parsed.data.description,
      notes: parsed.data.notes || null,
      amount_cents: parsed.data.amountCents,
      date: parsed.data.date,
      credit_card_id: parsed.data.creditCardId,
      invoice_id: invoiceIds[0],
      category_id: parsed.data.categoryId,
      is_installment_parent: true,
      installments_total: parsed.data.installmentsTotal,
    })
    .select("id")
    .single();

  if (parentError || !parent) {
    return fail("Não foi possível criar a compra parcelada. Tente novamente.");
  }

  const { error: installmentsError } = await supabase
    .from("transaction_installments")
    .insert(
      amounts.map((amountCents, k) => ({
        transaction_id: parent.id,
        user_id: user.id,
        installment_number: k + 1,
        amount_cents: amountCents,
        due_date: dueDateById.get(invoiceIds[k]!)!,
        status: "pending" as const,
        invoice_id: invoiceIds[k],
      })),
    );

  if (installmentsError) {
    await supabase.from("transactions").delete().eq("id", parent.id);
    return fail("Não foi possível criar as parcelas. Tente novamente.");
  }

  revalidateWithCard(parsed.data.creditCardId);
  const alert = await maybeBudgetAlert(
    supabase,
    user.id,
    parsed.data.categoryId,
    dueDateById.get(invoiceIds[0]!)!,
  );
  return ok({ alert });
}

/**
 * Reconstrói uma compra parcelada em ANDAMENTO (Fase 17, decisão 62 —
 * "entrada c" do hub de import): mãe + N parcelas, com as `paidCount`
 * primeiras nascendo já pagas e históricas (não afetam saldo — já refletidas
 * no saldo inicial da conta) e as demais normais (afetam saldo previsto).
 * Import/backfill não dispara alerta por linha (decisão 63) — só reconcilia
 * uma vez, se alguma parcela cair no mês corrente.
 */
export async function createInstallmentBackfillPurchase(
  input: unknown,
): Promise<ActionResult<{ alert: BudgetAlert | null }>> {
  const parsed = installmentBackfillAccountSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const plan = buildInstallmentPlan(
    parsed.data.amountCents,
    parsed.data.installmentsTotal,
    parsed.data.firstDueDate,
  );
  const paidCount = parsed.data.paidCount;

  // Mãe: fora de v_entries (D4) — affects_balance irrelevante para saldo,
  // fica false só para marcar a origem histórica no badge.
  const { data: parent, error: parentError } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      type: "expense",
      status: "pending",
      description: parsed.data.description,
      notes: parsed.data.notes || null,
      amount_cents: parsed.data.amountCents,
      date: parsed.data.date,
      account_id: parsed.data.accountId,
      category_id: parsed.data.categoryId,
      is_installment_parent: true,
      installments_total: parsed.data.installmentsTotal,
      affects_balance: false,
    })
    .select("id")
    .single();

  if (parentError || !parent) {
    return fail("Não foi possível criar a compra parcelada. Tente novamente.");
  }

  const { error: installmentsError } = await supabase
    .from("transaction_installments")
    .insert(
      plan.map((item) => {
        const isPaid = item.number <= paidCount;
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
    return fail("Não foi possível criar as parcelas. Tente novamente.");
  }

  revalidate();
  const currentMonth = todayISO().slice(0, 7);
  const touchedThisMonth = plan.some(
    (item) => item.dueDate.slice(0, 7) === currentMonth,
  );
  const alert = touchedThisMonth
    ? await maybeBudgetAlert(
        supabase,
        user.id,
        parsed.data.categoryId,
        todayISO(),
      )
    : null;
  return ok({ alert });
}

/**
 * Fecha uma fatura como paga RETROATIVAMENTE (fork B2, decisão 57): mesma
 * mecânica de `payInvoice`, mas com `paid_at` no vencimento da fatura (não
 * "agora") e `affects_balance = false` — usada só pela reconstrução de
 * parcelamento em cartão, para faturas passadas tocadas por parcelas já
 * pagas (uma fatura antiga `open` consumiria limite disponível para sempre).
 */
async function settleInvoiceHistorically(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  args: {
    invoiceId: string;
    accountId: string;
    categoryId: string;
    dueDate: string;
    description: string;
  },
): Promise<boolean> {
  const { data: invoice } = await supabase
    .from("v_invoice_totals")
    .select("total_cents, status")
    .eq("invoice_id", args.invoiceId)
    .maybeSingle();
  if (
    !invoice ||
    invoice.status === "paid" ||
    !invoice.total_cents ||
    invoice.total_cents <= 0
  ) {
    return false;
  }

  const paidAt = new Date(`${args.dueDate}T12:00:00`).toISOString();
  const { data: payment, error: paymentError } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      type: "expense",
      status: "paid",
      description: args.description,
      amount_cents: invoice.total_cents,
      date: args.dueDate,
      paid_at: paidAt,
      account_id: args.accountId,
      category_id: args.categoryId,
      affects_balance: false,
    })
    .select("id")
    .single();
  if (paymentError || !payment) return false;

  const { error: invoiceError, count } = await supabase
    .from("credit_card_invoices")
    .update(
      { status: "paid", paid_at: paidAt, payment_transaction_id: payment.id },
      { count: "exact" },
    )
    .eq("id", args.invoiceId);
  if (invoiceError || count === 0) {
    await supabase.from("transactions").delete().eq("id", payment.id);
    return false;
  }

  await supabase
    .from("transactions")
    .update({ status: "paid", paid_at: paidAt })
    .eq("invoice_id", args.invoiceId)
    .eq("is_installment_parent", false);
  await supabase
    .from("transaction_installments")
    .update({ status: "paid", paid_at: paidAt })
    .eq("invoice_id", args.invoiceId);

  return true;
}

/** Mesma reconstrução, no CARTÃO — cada parcela cai na fatura do seu mês
 * (mesmo mecanismo de `createCardInstallmentPurchase`); as faturas passadas
 * tocadas por parcelas já pagas são fechadas como pagas (histórico). */
export async function createCardInstallmentBackfillPurchase(
  input: unknown,
): Promise<ActionResult<{ alert: BudgetAlert | null; invoicesSettled: number }>> {
  const parsed = installmentBackfillCardSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const paidCount = parsed.data.paidCount;
  if (paidCount > 0 && !parsed.data.settlementAccountId) {
    return fail("Escolha a conta usada para pagar as faturas passadas.");
  }

  const amounts = splitInstallments(
    parsed.data.amountCents,
    parsed.data.installmentsTotal,
  );
  const purchaseDate = parseDateOnly(parsed.data.date);
  const monthDates = amounts.map((_, k) =>
    toDateOnly(addMonths(purchaseDate, k)),
  );

  const invoiceIds: string[] = [];
  for (const monthDate of monthDates) {
    const { data: invoiceId, error: invoiceError } = await supabase.rpc(
      "get_or_create_invoice",
      {
        p_credit_card_id: parsed.data.creditCardId,
        p_purchase_date: monthDate,
      },
    );
    if (invoiceError || !invoiceId) {
      return fail(
        "Não foi possível abrir as faturas do cartão. Tente de novo.",
      );
    }
    invoiceIds.push(invoiceId);
  }

  const { data: invoices, error: invoicesError } = await supabase
    .from("credit_card_invoices")
    .select("id, due_date, status")
    .in("id", invoiceIds);
  if (invoicesError || !invoices) {
    return fail("Não foi possível ler as faturas do cartão. Tente novamente.");
  }
  const invoiceById = new Map(invoices.map((inv) => [inv.id, inv]));

  // Guarda: as faturas que serão fechadas (1..paidCount) não podem já estar
  // pagas — inserir itens numa fatura paga violaria o estado.
  for (let k = 0; k < paidCount; k++) {
    if (invoiceById.get(invoiceIds[k]!)?.status === "paid") {
      return fail(
        "Uma das faturas passadas já está paga. Reabra-a antes de reconstruir.",
      );
    }
  }

  const { data: card } = await supabase
    .from("credit_cards")
    .select("name")
    .eq("id", parsed.data.creditCardId)
    .maybeSingle();

  // Mãe: na fatura do mês da compra (1ª parcela).
  const { data: parent, error: parentError } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      type: "expense",
      status: "pending",
      description: parsed.data.description,
      notes: parsed.data.notes || null,
      amount_cents: parsed.data.amountCents,
      date: parsed.data.date,
      credit_card_id: parsed.data.creditCardId,
      invoice_id: invoiceIds[0],
      category_id: parsed.data.categoryId,
      is_installment_parent: true,
      installments_total: parsed.data.installmentsTotal,
      affects_balance: false,
    })
    .select("id")
    .single();

  if (parentError || !parent) {
    return fail("Não foi possível criar a compra parcelada. Tente novamente.");
  }

  const { error: installmentsError } = await supabase
    .from("transaction_installments")
    .insert(
      amounts.map((amountCents, k) => {
        const isPaid = k < paidCount;
        const dueDate = invoiceById.get(invoiceIds[k]!)!.due_date;
        return {
          transaction_id: parent.id,
          user_id: user.id,
          installment_number: k + 1,
          amount_cents: amountCents,
          due_date: dueDate,
          status: (isPaid ? "paid" : "pending") as "paid" | "pending",
          paid_at: isPaid ? new Date(`${dueDate}T12:00:00`).toISOString() : null,
          invoice_id: invoiceIds[k],
          affects_balance: !isPaid,
        };
      }),
    );

  if (installmentsError) {
    await supabase.from("transactions").delete().eq("id", parent.id);
    return fail("Não foi possível criar as parcelas. Tente novamente.");
  }

  let invoicesSettled = 0;
  if (paidCount > 0) {
    const settledInvoiceIds = [...new Set(invoiceIds.slice(0, paidCount))];
    for (const invoiceId of settledInvoiceIds) {
      const invoice = invoiceById.get(invoiceId)!;
      const settled = await settleInvoiceHistorically(supabase, user.id, {
        invoiceId,
        accountId: parsed.data.settlementAccountId!,
        categoryId: parsed.data.categoryId,
        dueDate: invoice.due_date,
        description: `Pagamento fatura (histórico) ${card?.name ?? "cartão"}`,
      });
      if (settled) invoicesSettled += 1;
    }
  }

  revalidateWithCard(parsed.data.creditCardId);
  const currentMonth = todayISO().slice(0, 7);
  const touchedThisMonth = monthDates.some(
    (d) => d.slice(0, 7) === currentMonth,
  );
  const alert = touchedThisMonth
    ? await maybeBudgetAlert(
        supabase,
        user.id,
        parsed.data.categoryId,
        todayISO(),
      )
    : null;
  return ok({ alert, invoicesSettled });
}

export async function setInstallmentStatus(
  id: unknown,
  status: unknown,
): Promise<ActionResult<null>> {
  const parsedId = installmentIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Parcela inválida.");
  const parsedStatus = entryStatusSchema.safeParse(status);
  if (!parsedStatus.success) return fail("Status inválido.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { error, count } = await supabase
    .from("transaction_installments")
    .update(
      { status: parsedStatus.data, paid_at: paidAtFor(parsedStatus.data) },
      { count: "exact" },
    )
    .eq("id", parsedId.data);

  if (error) return fail("Não foi possível atualizar a parcela.");
  if (count === 0) return fail("Parcela não encontrada.");

  revalidate();
  return ok(null);
}

export async function createTransfer(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = transferFormSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const groupId = crypto.randomUUID();
  const paidAt = paidAtFor(parsed.data.status);
  const shared = {
    user_id: user.id,
    type: "transfer" as const,
    status: parsed.data.status,
    description: parsed.data.description,
    notes: parsed.data.notes || null,
    amount_cents: parsed.data.amountCents,
    date: parsed.data.date,
    paid_at: paidAt,
    transfer_group_id: groupId,
    affects_balance: parsed.data.affectsBalance, // aplica às DUAS pernas
  };

  // Par espelhado num único INSERT — as duas pernas entram atomicamente (D3).
  const { error } = await supabase.from("transactions").insert([
    {
      ...shared,
      account_id: parsed.data.fromAccountId,
      transfer_direction: "out" as const,
    },
    {
      ...shared,
      account_id: parsed.data.toAccountId,
      transfer_direction: "in" as const,
    },
  ]);

  if (error) {
    return fail("Não foi possível criar a transferência. Tente novamente.");
  }

  revalidate();
  return ok(null);
}

export async function updateTransfer(
  groupId: unknown,
  input: unknown,
): Promise<ActionResult<null>> {
  const parsedGroup = transferGroupIdSchema.safeParse(groupId);
  if (!parsedGroup.success) return fail("Transferência inválida.");

  const parsed = transferFormSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  // 1) Campos espelhados nas duas pernas de uma vez (statement único, atômico).
  const { error: sharedError, count } = await supabase
    .from("transactions")
    .update(
      {
        status: parsed.data.status,
        description: parsed.data.description,
        notes: parsed.data.notes || null,
        amount_cents: parsed.data.amountCents,
        date: parsed.data.date,
        paid_at: paidAtFor(parsed.data.status),
        affects_balance: parsed.data.affectsBalance, // aplica às DUAS pernas
      },
      { count: "exact" },
    )
    .eq("transfer_group_id", parsedGroup.data);

  if (sharedError) {
    return fail("Não foi possível salvar a transferência. Tente novamente.");
  }
  if (count === 0) return fail("Transferência não encontrada.");

  // 2) Conta de cada perna (out = origem, in = destino).
  const { error: outError } = await supabase
    .from("transactions")
    .update({ account_id: parsed.data.fromAccountId })
    .eq("transfer_group_id", parsedGroup.data)
    .eq("transfer_direction", "out");
  const { error: inError } = await supabase
    .from("transactions")
    .update({ account_id: parsed.data.toAccountId })
    .eq("transfer_group_id", parsedGroup.data)
    .eq("transfer_direction", "in");

  if (outError || inError) {
    return fail(
      "As contas da transferência podem não ter sido atualizadas por completo. Confira e salve de novo.",
    );
  }

  revalidate();
  return ok(null);
}

/**
 * Alvo de status/exclusão: uma transferência opera sempre no PAR (pelo grupo);
 * os demais lançamentos, pelo id.
 */
const entryTargetSchema = z.union([
  z.object({ transferGroupId: z.uuid() }),
  z.object({ transactionId: z.uuid() }),
]);

export async function setEntryStatus(
  target: unknown,
  status: unknown,
): Promise<ActionResult<null>> {
  const parsedTarget = entryTargetSchema.safeParse(target);
  if (!parsedTarget.success) return fail("Lançamento inválido.");
  const parsedStatus = entryStatusSchema.safeParse(status);
  if (!parsedStatus.success) return fail("Status inválido.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  let query = supabase
    .from("transactions")
    .update(
      { status: parsedStatus.data, paid_at: paidAtFor(parsedStatus.data) },
      { count: "exact" },
    );
  query =
    "transferGroupId" in parsedTarget.data
      ? query.eq("transfer_group_id", parsedTarget.data.transferGroupId)
      : query.eq("id", parsedTarget.data.transactionId);

  const { error, count } = await query;

  if (error) return fail("Não foi possível atualizar o status.");
  if (count === 0) return fail("Lançamento não encontrado.");

  revalidate();
  return ok(null);
}

type EntryTarget =
  | { transferGroupId: string }
  | { transactionId: string };

/**
 * Núcleo de exclusão compartilhado por `deleteEntry` (1 alvo) e
 * `deleteEntries` (seleção em massa — recém-adicionado para o botão
 * "Excluir selecionados" da lista): limpa anexos do Storage (não caem por
 * cascade — só a linha de `attachments`) e apaga a transação/o par/a compra
 * inteira (cascade cuida das parcelas). `count === 0` não é erro aqui — numa
 * seleção em massa é esperado quando duas linhas resolvem para o mesmo alvo
 * (ex.: duas parcelas da mesma compra) e a primeira já apagou o resto.
 */
async function performEntryDelete(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  target: EntryTarget,
): Promise<{ deleted: boolean; error?: string }> {
  const transactionIds: string[] = [];
  if ("transferGroupId" in target) {
    const { data: legs } = await supabase
      .from("transactions")
      .select("id")
      .eq("transfer_group_id", target.transferGroupId);
    transactionIds.push(...(legs ?? []).map((leg) => leg.id));
  } else {
    transactionIds.push(target.transactionId);
  }
  for (const transactionId of transactionIds) {
    const prefix = `${userId}/${transactionId}`;
    const { data: files } = await supabase.storage
      .from("attachments")
      .list(prefix);
    if (files && files.length > 0) {
      await supabase.storage
        .from("attachments")
        .remove(files.map((file) => `${prefix}/${file.name}`));
    }
  }

  let query = supabase.from("transactions").delete({ count: "exact" });
  query =
    "transferGroupId" in target
      ? query.eq("transfer_group_id", target.transferGroupId)
      : query.eq("id", target.transactionId);

  const { error, count } = await query;

  if (error) {
    return {
      deleted: false,
      error:
        error.code === FK_RESTRICT_VIOLATION
          ? "Vinculado a outros registros."
          : "Falha ao excluir.",
    };
  }
  return { deleted: (count ?? 0) > 0 };
}

export async function deleteEntry(
  target: unknown,
): Promise<ActionResult<null>> {
  const parsedTarget = entryTargetSchema.safeParse(target);
  if (!parsedTarget.success) return fail("Lançamento inválido.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const result = await performEntryDelete(supabase, user.id, parsedTarget.data);
  if (result.error) return fail(result.error);
  if (!result.deleted) return fail("Lançamento não encontrado.");

  revalidate();
  return ok(null);
}

/** Exclusão em massa (seleção múltipla na lista de transações). Deduplica
 * alvos repetidos (parcelas da mesma compra, pernas da mesma transferência)
 * antes de processar — cada um só precisa ser apagado uma vez. */
export async function deleteEntries(
  targets: unknown,
): Promise<ActionResult<{ deletedCount: number }>> {
  const parsed = z.array(entryTargetSchema).min(1).max(500).safeParse(targets);
  if (!parsed.success) return fail("Seleção inválida.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const seen = new Set<string>();
  const uniqueTargets = parsed.data.filter((target) => {
    const key =
      "transferGroupId" in target
        ? `t:${target.transferGroupId}`
        : `x:${target.transactionId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  let deletedCount = 0;
  for (const target of uniqueTargets) {
    const result = await performEntryDelete(supabase, user.id, target);
    if (result.deleted) deletedCount += 1;
  }

  revalidate();

  if (deletedCount === 0) {
    return fail("Não foi possível excluir os lançamentos selecionados.");
  }
  return ok({ deletedCount });
}

export async function createAttachment(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = attachmentMetaSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Arquivo inválido. Confira tipo e tamanho (máx. 10 MB).");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  // O path precisa estar dentro do prefixo do próprio usuário E do lançamento
  // informado — espelha a policy de path do bucket (ARQUITETURA.md §4.2).
  if (
    !parsed.data.storagePath.startsWith(
      `${user.id}/${parsed.data.transactionId}/`,
    )
  ) {
    return fail("Arquivo inválido.");
  }

  // Upload é a action de escrita mais pesada (§9) — janela deslizante 60/hora.
  const { data: allowed } = await supabase.rpc("check_rate_limit", {
    p_key: `${user.id}:upload`,
    p_max_hits: 60,
    p_window: "1 hour",
  });
  if (allowed === false) {
    return fail("Muitos uploads em pouco tempo. Aguarde e tente de novo.");
  }

  const { error } = await supabase.from("attachments").insert({
    user_id: user.id,
    transaction_id: parsed.data.transactionId,
    file_name: parsed.data.fileName,
    storage_path: parsed.data.storagePath,
    mime_type: parsed.data.mimeType,
    size_bytes: parsed.data.sizeBytes,
  });

  if (error) {
    return fail("Não foi possível registrar o anexo. Tente novamente.");
  }
  return ok(null);
}

export async function deleteAttachment(
  id: unknown,
): Promise<ActionResult<null>> {
  const parsedId = attachmentIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Anexo inválido.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { data: attachment } = await supabase
    .from("attachments")
    .select("id, storage_path")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (!attachment) return fail("Anexo não encontrado.");

  const { error: storageError } = await supabase.storage
    .from("attachments")
    .remove([attachment.storage_path]);
  if (storageError) {
    return fail("Não foi possível remover o arquivo. Tente novamente.");
  }

  const { error } = await supabase
    .from("attachments")
    .delete()
    .eq("id", parsedId.data);
  if (error) {
    return fail("Não foi possível excluir o anexo. Tente novamente.");
  }
  return ok(null);
}
