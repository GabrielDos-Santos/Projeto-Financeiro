"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { formatMonthBR } from "@/lib/dates";
import {
  cardFormSchema,
  cardIdSchema,
  invoiceIdSchema,
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
 * Pagar fatura (D5): cria uma despesa na conta escolhida (debita o caixa),
 * marca a fatura como paga e propaga `paid` para as compras/parcelas dela.
 * A despesa de pagamento NÃO conta nos relatórios por categoria (migration
 * 0010) — as compras já contam por competência.
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
    .select("invoice_id, status, total_cents, reference_month, credit_card_id")
    .eq("invoice_id", parsed.data.invoiceId)
    .maybeSingle();

  if (!invoice) return fail("Fatura não encontrada.");
  if (invoice.status === "paid") return fail("Esta fatura já foi paga.");
  if (!invoice.total_cents || invoice.total_cents <= 0) {
    return fail("Não há valor a pagar nesta fatura.");
  }

  const { data: card } = await supabase
    .from("credit_cards")
    .select("name")
    .eq("id", invoice.credit_card_id!)
    .maybeSingle();

  const monthLabel = invoice.reference_month
    ? formatMonthBR(invoice.reference_month)
    : "";
  const description = `Pagamento fatura ${card?.name ?? "cartão"} · ${monthLabel}`;
  const paidAt = new Date().toISOString();

  // 1) Despesa na conta escolhida (caixa). Fork B2 (decisão 57): fatura
  // histórica vira essa MESMA transação, só com affects_balance = false —
  // payment_transaction_id continua sempre preenchido em fatura paga.
  const { data: payment, error: paymentError } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      type: "expense",
      status: "paid",
      description,
      amount_cents: invoice.total_cents,
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

  // 2) Quita a fatura e liga a transação de pagamento.
  const { error: invoiceError, count } = await supabase
    .from("credit_card_invoices")
    .update(
      {
        status: "paid",
        paid_at: paidAt,
        payment_transaction_id: payment.id,
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.invoiceId);

  if (invoiceError || count === 0) {
    // Rollback do pagamento para não debitar a conta sem quitar a fatura.
    await supabase.from("transactions").delete().eq("id", payment.id);
    return fail("Não foi possível quitar a fatura. Tente novamente.");
  }

  // 3) Propaga `paid` para as compras à vista e parcelas da fatura.
  await supabase
    .from("transactions")
    .update({ status: "paid", paid_at: paidAt })
    .eq("invoice_id", parsed.data.invoiceId)
    .eq("is_installment_parent", false);
  await supabase
    .from("transaction_installments")
    .update({ status: "paid", paid_at: paidAt })
    .eq("invoice_id", parsed.data.invoiceId);

  revalidatePath("/cartoes");
  revalidatePath(`/cartoes/${invoice.credit_card_id}`);
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
    .select("id, status, payment_transaction_id, credit_card_id")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (!invoice) return fail("Fatura não encontrada.");
  if (invoice.status !== "paid") return fail("Esta fatura não está paga.");

  const { error: invoiceError } = await supabase
    .from("credit_card_invoices")
    .update({ status: "closed", paid_at: null, payment_transaction_id: null })
    .eq("id", parsedId.data);
  if (invoiceError) {
    return fail("Não foi possível reabrir a fatura. Tente novamente.");
  }

  // Itens voltam a pendente; a despesa de pagamento é apagada.
  await supabase
    .from("transactions")
    .update({ status: "pending", paid_at: null })
    .eq("invoice_id", parsedId.data)
    .eq("is_installment_parent", false);
  await supabase
    .from("transaction_installments")
    .update({ status: "pending", paid_at: null })
    .eq("invoice_id", parsedId.data);
  if (invoice.payment_transaction_id) {
    await supabase
      .from("transactions")
      .delete()
      .eq("id", invoice.payment_transaction_id);
  }

  revalidatePath("/cartoes");
  revalidatePath(`/cartoes/${invoice.credit_card_id}`);
  revalidatePath("/transacoes");
  revalidatePath("/contas");
  return ok(null);
}
