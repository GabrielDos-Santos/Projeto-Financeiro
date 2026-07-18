"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { budgetFormSchema, budgetIdSchema } from "./schemas";

const UNIQUE_VIOLATION = "23505";

export async function createBudget(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = budgetFormSchema.safeParse(input);
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

  const { error } = await supabase.from("budgets").insert({
    user_id: user.id,
    category_id: parsed.data.categoryId,
    month: parsed.data.month,
    amount_cents: parsed.data.amountCents,
    alert_threshold: parsed.data.alertThreshold,
  });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return fail("Essa categoria já tem orçamento neste mês.", {
        categoryId: ["Essa categoria já tem orçamento neste mês"],
      });
    }
    return fail("Não foi possível criar o orçamento. Tente novamente.");
  }

  revalidatePath("/orcamentos");
  return ok(null);
}

export async function updateBudget(
  id: unknown,
  input: unknown,
): Promise<ActionResult<null>> {
  const parsedId = budgetIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Orçamento inválido.");

  const parsed = budgetFormSchema.safeParse(input);
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

  // Categoria e mês não mudam na edição (seria outro orçamento) — só teto e alerta.
  const { error, count } = await supabase
    .from("budgets")
    .update(
      {
        amount_cents: parsed.data.amountCents,
        alert_threshold: parsed.data.alertThreshold,
      },
      { count: "exact" },
    )
    .eq("id", parsedId.data);

  if (error) {
    return fail("Não foi possível salvar o orçamento. Tente novamente.");
  }
  if (count === 0) return fail("Orçamento não encontrado.");

  revalidatePath("/orcamentos");
  return ok(null);
}

export async function deleteBudget(id: unknown): Promise<ActionResult<null>> {
  const parsedId = budgetIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Orçamento inválido.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { error, count } = await supabase
    .from("budgets")
    .delete({ count: "exact" })
    .eq("id", parsedId.data);

  if (error) {
    return fail("Não foi possível excluir o orçamento. Tente novamente.");
  }
  if (count === 0) return fail("Orçamento não encontrado.");

  revalidatePath("/orcamentos");
  return ok(null);
}
