"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { accountFormSchema, accountIdSchema } from "./schemas";

const UNIQUE_VIOLATION = "23505";
const FK_RESTRICT_VIOLATION = "23503";

export async function createAccount(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = accountFormSchema.safeParse(input);
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

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name: parsed.data.name,
    type: parsed.data.type,
    initial_balance_cents: parsed.data.initialBalanceCents,
    color: parsed.data.color,
    icon: parsed.data.icon,
  });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return fail("Você já tem uma conta com esse nome.", {
        name: ["Você já tem uma conta com esse nome"],
      });
    }
    return fail("Não foi possível criar a conta. Tente novamente.");
  }

  revalidatePath("/contas");
  return ok(null);
}

export async function updateAccount(
  id: unknown,
  input: unknown,
): Promise<ActionResult<null>> {
  const parsedId = accountIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Conta inválida.");

  const parsed = accountFormSchema.safeParse(input);
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

  // RLS restringe ao dono; `count` acusa id inexistente/alheio.
  const { error, count } = await supabase
    .from("accounts")
    .update(
      {
        name: parsed.data.name,
        type: parsed.data.type,
        initial_balance_cents: parsed.data.initialBalanceCents,
        color: parsed.data.color,
        icon: parsed.data.icon,
      },
      { count: "exact" },
    )
    .eq("id", parsedId.data);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return fail("Você já tem uma conta com esse nome.", {
        name: ["Você já tem uma conta com esse nome"],
      });
    }
    return fail("Não foi possível salvar a conta. Tente novamente.");
  }
  if (count === 0) return fail("Conta não encontrada.");

  revalidatePath("/contas");
  return ok(null);
}

export async function setAccountArchived(
  id: unknown,
  isArchived: boolean,
): Promise<ActionResult<null>> {
  const parsedId = accountIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Conta inválida.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { error, count } = await supabase
    .from("accounts")
    .update({ is_archived: isArchived }, { count: "exact" })
    .eq("id", parsedId.data);

  if (error) return fail("Não foi possível atualizar a conta.");
  if (count === 0) return fail("Conta não encontrada.");

  revalidatePath("/contas");
  return ok(null);
}

export async function deleteAccount(id: unknown): Promise<ActionResult<null>> {
  const parsedId = accountIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Conta inválida.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { error, count } = await supabase
    .from("accounts")
    .delete({ count: "exact" })
    .eq("id", parsedId.data);

  if (error) {
    // FKs financeiras são ON DELETE RESTRICT: histórico nunca some por cascata.
    if (error.code === FK_RESTRICT_VIOLATION) {
      return fail(
        "Esta conta tem lançamentos e não pode ser excluída. Arquive-a.",
      );
    }
    return fail("Não foi possível excluir a conta. Tente novamente.");
  }
  if (count === 0) return fail("Conta não encontrada.");

  revalidatePath("/contas");
  return ok(null);
}
