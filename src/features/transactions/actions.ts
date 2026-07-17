"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import {
  entryFormSchema,
  entryStatusSchema,
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

export async function createTransaction(
  input: unknown,
): Promise<ActionResult<null>> {
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
  });

  if (error) {
    return fail("Não foi possível criar o lançamento. Tente novamente.");
  }

  revalidate();
  return ok(null);
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

  let query = supabase.from("transactions").delete({ count: "exact" });
  query =
    "transferGroupId" in parsedTarget.data
      ? query.eq("transfer_group_id", parsedTarget.data.transferGroupId)
      : query.eq("id", parsedTarget.data.transactionId);

  const { error, count } = await query;

  if (error) {
    if (error.code === FK_RESTRICT_VIOLATION) {
      return fail("Este lançamento está vinculado a outros registros.");
    }
    return fail("Não foi possível excluir o lançamento. Tente novamente.");
  }
  if (count === 0) return fail("Lançamento não encontrado.");

  revalidate();
  return ok(null);
}
