"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { formatMonthBR, todayISO } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import {
  cardFormSchema,
  cardIdSchema,
  invoiceIdSchema,
  invoicePaymentIdSchema,
  payInvoiceSchema,
} from "./schemas";

const UNIQUE_VIOLATION = "23505";
const FK_RESTRICT_VIOLATION = "23503";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Status "natural" de uma fatura NÃO paga, reconstruído a partir do fechamento:
 * `open` enquanto o período ainda corre, `closed` a partir da data de
 * fechamento. Não existe fechamento automático no banco (nada em 0006/0008
 * altera o status) — ao reverter um pagamento, fixar `closed` na marra marcava
 * como "Fechada" uma fatura que ainda nem fechou. Datas ISO (YYYY-MM-DD)
 * comparam corretamente como string.
 */
function unpaidInvoiceStatus(closingDate: string | null): "open" | "closed" {
  if (!closingDate) return "closed";
  return closingDate <= todayISO() ? "closed" : "open";
}

export async function createCard(input: unknown): Promise<ActionResult<null>> {
  const parsed = cardFormSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { error } = await supabase.from("credit_cards").insert({
    user_id: user.id,
    name: parsed.data.name,
    bank: parsed.data.bank || null,
    limit_cents: parsed.data.limitCents,
    closing_day: parsed.data.closingDay,
    due_day: parsed.data.dueDay,
    color: parsed.data.color,
    icon: parsed.data.icon,
    invoice_name_by_due_month: parsed.data.invoiceNameByDueMonth,
  });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return fail("Você já tem um cartão com esse nome.", {
        name: ["Você já tem um cartão com esse nome"],
      });
    }
    return fail("Não foi possível criar o cartão. Tente novamente.");
  }

  revalidatePath("/cartoes");
  return ok(null);
}

export async function updateCard(
  id: unknown,
  input: unknown,
): Promise<ActionResult<null>> {
  const parsedId = cardIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Cartão inválido.");

  const parsed = cardFormSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { error, count } = await supabase
    .from("credit_cards")
    .update(
      {
        name: parsed.data.name,
        bank: parsed.data.bank || null,
        limit_cents: parsed.data.limitCents,
        closing_day: parsed.data.closingDay,
        due_day: parsed.data.dueDay,
        color: parsed.data.color,
        icon: parsed.data.icon,
        invoice_name_by_due_month: parsed.data.invoiceNameByDueMonth,
      },
      { count: "exact" },
    )
    .eq("id", parsedId.data);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return fail("Você já tem um cartão com esse nome.", {
        name: ["Você já tem um cartão com esse nome"],
      });
    }
    return fail("Não foi possível salvar o cartão. Tente novamente.");
  }
  if (count === 0) return fail("Cartão não encontrado.");

  revalidatePath("/cartoes");
  revalidatePath(`/cartoes/${parsedId.data}`);
  return ok(null);
}

export async function setCardArchived(
  id: unknown,
  isArchived: boolean,
): Promise<ActionResult<null>> {
  const parsedId = cardIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Cartão inválido.");

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { error, count } = await supabase
    .from("credit_cards")
    .update({ is_archived: isArchived }, { count: "exact" })
    .eq("id", parsedId.data);

  if (error) return fail("Não foi possível atualizar o cartão.");
  if (count === 0) return fail("Cartão não encontrado.");

  revalidatePath("/cartoes");
  return ok(null);
}

export async function deleteCard(id: unknown): Promise<ActionResult<null>> {
  const parsedId = cardIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Cartão inválido.");

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { error, count } = await supabase
    .from("credit_cards")
    .delete({ count: "exact" })
    .eq("id", parsedId.data);

  if (error) {
    // Compras no cartão são ON DELETE RESTRICT: histórico não some por cascata.
    if (error.code === FK_RESTRICT_VIOLATION) {
      return fail(
        "Este cartão tem compras lançadas e não pode ser excluído. Arquive-o.",
      );
    }
    return fail("Não foi possível excluir o cartão. Tente novamente.");
  }
  if (count === 0) return fail("Cartão não encontrado.");

  revalidatePath("/cartoes");
  return ok(null);
}

/**
 * Pagar fatura (D5), total OU parcial: cria uma despesa na conta escolhida
 * (debita o caixa) por `amountCents` e registra o pagamento em
 * `credit_card_invoice_payments`. A fatura só vira `paid` (propagando `paid`
 * às compras/parcelas) quando o acumulado atinge o total — enquanto isso ela
 * fica "parcialmente paga" e o restante segue devendo na mesma fatura.
 * A despesa de pagamento NÃO conta nos relatórios por categoria (migration
 * 0010/0019) — as compras já contam por competência.
 */
export async function payInvoice(input: unknown): Promise<ActionResult<null>> {
  const parsed = payInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { data: invoice } = await supabase
    .from("v_invoice_totals")
    .select(
      "invoice_id, status, total_cents, paid_cents, reference_month, due_date, credit_card_id",
    )
    .eq("invoice_id", parsed.data.invoiceId)
    .maybeSingle();

  if (!invoice) return fail("Fatura não encontrada.");
  if (invoice.status === "paid") return fail("Esta fatura já foi paga.");

  const total = invoice.total_cents ?? 0;
  const alreadyPaid = invoice.paid_cents ?? 0;
  const remaining = Math.max(0, total - alreadyPaid);
  if (remaining <= 0) return fail("Não há valor a pagar nesta fatura.");

  const amount = parsed.data.amountCents;
  if (amount > remaining) {
    return fail(`O valor excede o restante da fatura (${formatCents(remaining)}).`, {
      amountCents: [`Máximo: ${formatCents(remaining)}`],
    });
  }
  // Quando este pagamento zera o saldo, a fatura é quitada.
  const clearsInvoice = alreadyPaid + amount >= total;

  const { data: card } = await supabase
    .from("credit_cards")
    .select("name, invoice_name_by_due_month")
    .eq("id", invoice.credit_card_id!)
    .maybeSingle();

  // Rótulo por cartão (decisão do usuário, não universal — bancos variam):
  // Sicredi chama a fatura pelo mês de VENCIMENTO; a maioria chama pelo mês
  // de competência (mesmo mês do fechamento). Ver migration 0013.
  const monthSource =
    card?.invoice_name_by_due_month && invoice.due_date
      ? invoice.due_date
      : invoice.reference_month;
  const monthLabel = monthSource ? formatMonthBR(monthSource) : "";
  const prefix = clearsInvoice ? "Pagamento" : "Pagamento parcial";
  const description = `${prefix} fatura ${card?.name ?? "cartão"} · ${monthLabel}`;
  const paidAt = new Date().toISOString();

  // 1) Despesa na conta escolhida (caixa). Fork B2 (decisão 57): pagamento
  // histórico é a MESMA transação, só com affects_balance = false.
  const { data: payment, error: paymentError } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      type: "expense",
      status: "paid",
      description,
      amount_cents: amount,
      date: parsed.data.date,
      paid_at: paidAt,
      account_id: parsed.data.accountId,
      category_id: parsed.data.categoryId,
      affects_balance: parsed.data.affectsBalance,
    })
    .select("id")
    .single();

  if (paymentError || !payment) {
    return fail("Não foi possível registrar o pagamento. Tente novamente.");
  }

  // 2) Liga o pagamento à fatura (fonte da verdade do "quanto já pago").
  const { error: linkError } = await supabase
    .from("credit_card_invoice_payments")
    .insert({
      user_id: user.id,
      invoice_id: parsed.data.invoiceId,
      transaction_id: payment.id,
      amount_cents: amount,
    });

  if (linkError) {
    // Rollback: não deixa a despesa órfã debitando a conta.
    await supabase.from("transactions").delete().eq("id", payment.id);
    return fail("Não foi possível registrar o pagamento. Tente novamente.");
  }

  // 3) Só quita a fatura (e propaga `paid`) quando o total foi coberto.
  if (clearsInvoice) {
    const { error: invoiceError, count } = await supabase
      .from("credit_card_invoices")
      .update(
        { status: "paid", paid_at: paidAt, payment_transaction_id: payment.id },
        { count: "exact" },
      )
      .eq("id", parsed.data.invoiceId);

    if (invoiceError || count === 0) {
      // Rollback deste pagamento inteiro.
      await supabase
        .from("credit_card_invoice_payments")
        .delete()
        .eq("transaction_id", payment.id);
      await supabase.from("transactions").delete().eq("id", payment.id);
      return fail("Não foi possível quitar a fatura. Tente novamente.");
    }

    // Propaga `paid` para as compras à vista e parcelas da fatura.
    await supabase
      .from("transactions")
      .update({ status: "paid", paid_at: paidAt })
      .eq("invoice_id", parsed.data.invoiceId)
      .eq("is_installment_parent", false);
    await supabase
      .from("transaction_installments")
      .update({ status: "paid", paid_at: paidAt })
      .eq("invoice_id", parsed.data.invoiceId);
  }

  revalidatePath("/cartoes");
  revalidatePath(`/cartoes/${invoice.credit_card_id}`);
  revalidatePath("/transacoes");
  revalidatePath("/contas");
  return ok(null);
}

/**
 * Remove UM pagamento (parcial ou o que quitou a fatura): apaga a despesa e a
 * linha de ligação. Se a fatura estava quitada, ela volta a não-paga (aberta ou
 * fechada conforme a data de fechamento, itens a pendente) — mesma reversão do
 * reopen, mas para um único lançamento.
 */
export async function removeInvoicePayment(
  paymentId: unknown,
): Promise<ActionResult<null>> {
  const parsed = invoicePaymentIdSchema.safeParse(paymentId);
  if (!parsed.success) return fail("Pagamento inválido.");

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { data: pmt } = await supabase
    .from("credit_card_invoice_payments")
    .select("id, invoice_id, transaction_id")
    .eq("id", parsed.data)
    .maybeSingle();
  if (!pmt) return fail("Pagamento não encontrado.");

  const { data: invoice } = await supabase
    .from("credit_card_invoices")
    .select("id, status, closing_date, credit_card_id")
    .eq("id", pmt.invoice_id)
    .maybeSingle();

  // Apaga a linha e a despesa. Se a fatura estava quitada por este (ou por
  // vários) pagamento(s), ela deixa de estar paga.
  await supabase
    .from("credit_card_invoice_payments")
    .delete()
    .eq("id", pmt.id);
  const { error: txnError } = await supabase
    .from("transactions")
    .delete()
    .eq("id", pmt.transaction_id);
  if (txnError) {
    return fail("Não foi possível remover o pagamento. Tente novamente.");
  }

  if (invoice?.status === "paid") {
    await supabase
      .from("credit_card_invoices")
      .update({
        status: unpaidInvoiceStatus(invoice.closing_date),
        paid_at: null,
        payment_transaction_id: null,
      })
      .eq("id", invoice.id);
    await supabase
      .from("transactions")
      .update({ status: "pending", paid_at: null })
      .eq("invoice_id", invoice.id)
      .eq("is_installment_parent", false);
    await supabase
      .from("transaction_installments")
      .update({ status: "pending", paid_at: null })
      .eq("invoice_id", invoice.id);
  }

  revalidatePath("/cartoes");
  if (invoice?.credit_card_id) {
    revalidatePath(`/cartoes/${invoice.credit_card_id}`);
  }
  revalidatePath("/transacoes");
  revalidatePath("/contas");
  return ok(null);
}

/** Reabre uma fatura paga: apaga a despesa de pagamento e volta os itens a pendente. */
export async function reopenInvoice(id: unknown): Promise<ActionResult<null>> {
  const parsedId = invoiceIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Fatura inválida.");

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { data: invoice } = await supabase
    .from("credit_card_invoices")
    .select("id, status, closing_date, payment_transaction_id, credit_card_id")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (!invoice) return fail("Fatura não encontrada.");
  if (invoice.status !== "paid") return fail("Esta fatura não está paga.");

  const { error: invoiceError } = await supabase
    .from("credit_card_invoices")
    .update({
      status: unpaidInvoiceStatus(invoice.closing_date),
      paid_at: null,
      payment_transaction_id: null,
    })
    .eq("id", parsedId.data);
  if (invoiceError) {
    return fail("Não foi possível reabrir a fatura. Tente novamente.");
  }

  // Itens voltam a pendente.
  await supabase
    .from("transactions")
    .update({ status: "pending", paid_at: null })
    .eq("invoice_id", parsedId.data)
    .eq("is_installment_parent", false);
  await supabase
    .from("transaction_installments")
    .update({ status: "pending", paid_at: null })
    .eq("invoice_id", parsedId.data);

  // Apaga TODAS as despesas de pagamento (parciais + a que quitou). Deletar a
  // transação também remove a linha de credit_card_invoice_payments (cascata).
  const { data: payments } = await supabase
    .from("credit_card_invoice_payments")
    .select("transaction_id")
    .eq("invoice_id", parsedId.data);
  const txnIds = (payments ?? []).map((p) => p.transaction_id);
  // Compat: faturas quitadas antes da 0019 não têm linha de pagamento, só o
  // payment_transaction_id — inclui essa despesa também.
  if (
    invoice.payment_transaction_id &&
    !txnIds.includes(invoice.payment_transaction_id)
  ) {
    txnIds.push(invoice.payment_transaction_id);
  }
  if (txnIds.length > 0) {
    await supabase.from("transactions").delete().in("id", txnIds);
  }

  revalidatePath("/cartoes");
  revalidatePath(`/cartoes/${invoice.credit_card_id}`);
  revalidatePath("/transacoes");
  revalidatePath("/contas");
  return ok(null);
}
