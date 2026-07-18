"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { contributeSchema, goalFormSchema, goalIdSchema } from "./schemas";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createGoal(input: unknown): Promise<ActionResult<null>> {
  const parsed = goalFormSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { error } = await supabase.from("goals").insert({
    user_id: user.id,
    name: parsed.data.name,
    description: parsed.data.description || null,
    target_amount_cents: parsed.data.targetAmountCents,
    target_date: parsed.data.targetDate || null,
    color: parsed.data.color,
    icon: parsed.data.icon,
  });

  if (error) {
    return fail("Não foi possível criar a meta. Tente novamente.");
  }

  revalidatePath("/metas");
  revalidatePath("/dashboard");
  return ok(null);
}

export async function updateGoal(
  id: unknown,
  input: unknown,
): Promise<ActionResult<null>> {
  const parsedId = goalIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Meta inválida.");

  const parsed = goalFormSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { error, count } = await supabase
    .from("goals")
    .update(
      {
        name: parsed.data.name,
        description: parsed.data.description || null,
        target_amount_cents: parsed.data.targetAmountCents,
        target_date: parsed.data.targetDate || null,
        color: parsed.data.color,
        icon: parsed.data.icon,
      },
      { count: "exact" },
    )
    .eq("id", parsedId.data);

  if (error) {
    return fail("Não foi possível salvar a meta. Tente novamente.");
  }
  if (count === 0) return fail("Meta não encontrada.");

  revalidatePath("/metas");
  revalidatePath("/dashboard");
  return ok(null);
}

export async function setGoalArchived(
  id: unknown,
  isArchived: boolean,
): Promise<ActionResult<null>> {
  const parsedId = goalIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Meta inválida.");

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  // Só alterna active ⇄ archived; concluída não se arquiva por aqui.
  const { error, count } = await supabase
    .from("goals")
    .update({ status: isArchived ? "archived" : "active" }, { count: "exact" })
    .eq("id", parsedId.data)
    .neq("status", "completed");

  if (error) return fail("Não foi possível atualizar a meta.");
  if (count === 0) return fail("Meta não encontrada ou já concluída.");

  revalidatePath("/metas");
  revalidatePath("/dashboard");
  return ok(null);
}

export async function deleteGoal(id: unknown): Promise<ActionResult<null>> {
  const parsedId = goalIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Meta inválida.");

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { error, count } = await supabase
    .from("goals")
    .delete({ count: "exact" })
    .eq("id", parsedId.data);

  if (error) {
    return fail("Não foi possível excluir a meta. Tente novamente.");
  }
  if (count === 0) return fail("Meta não encontrada.");

  revalidatePath("/metas");
  revalidatePath("/dashboard");
  return ok(null);
}

/**
 * Aporta na meta: soma ao valor atual (sem histórico de aportes no MVP —
 * `goal_contributions` é evolução futura, ARQUITETURA.md §4.2). Ao cruzar o
 * alvo, marca `completed` e notifica — a transição de status só acontece
 * UMA vez (não regride), então a notificação nunca duplica.
 */
export async function contributeToGoal(
  id: unknown,
  input: unknown,
): Promise<ActionResult<{ completed: boolean }>> {
  const parsedId = goalIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Meta inválida.");

  const parsed = contributeSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { data: goal } = await supabase
    .from("goals")
    .select("id, name, current_amount_cents, target_amount_cents, status")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (!goal) return fail("Meta não encontrada.");
  if (goal.status !== "active") {
    return fail("Só é possível aportar em metas em andamento.");
  }

  const newAmount = goal.current_amount_cents + parsed.data.amountCents;
  const justCompleted = newAmount >= goal.target_amount_cents;

  const { error } = await supabase
    .from("goals")
    .update({
      current_amount_cents: newAmount,
      status: justCompleted ? "completed" : "active",
    })
    .eq("id", parsedId.data);

  if (error) {
    return fail("Não foi possível registrar o aporte. Tente novamente.");
  }

  if (justCompleted) {
    // Melhor esforço: a notificação nunca derruba o aporte já confirmado.
    try {
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "goal_reached",
        title: `Meta "${goal.name}" concluída!`,
        body: "Você atingiu o valor alvo desta meta.",
        metadata: { goal_id: goal.id },
      });
    } catch {
      // ignora — o aporte já foi gravado com sucesso
    }
  }

  revalidatePath("/metas");
  revalidatePath("/dashboard");
  return ok({ completed: justCompleted });
}
