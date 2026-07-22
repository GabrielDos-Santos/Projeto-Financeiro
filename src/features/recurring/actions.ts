"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { todayISO } from "@/lib/dates";
import { firstRunOnOrAfter } from "@/services/recurrence";
import { recurringFormSchema, recurringIdSchema } from "./schemas";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Deriva as colunas do banco a partir do input validado. */
function toRow(data: z.infer<typeof recurringFormSchema>) {
  const isCard = data.ownerKind === "card";
  return {
    description: data.description,
    amount_cents: data.amountCents,
    type: data.type,
    category_id: data.categoryId,
    account_id: isCard ? null : data.accountId!,
    credit_card_id: isCard ? data.creditCardId! : null,
    frequency: data.frequency,
    interval_count: data.intervalCount,
    start_date: data.startDate,
    end_date: data.endDate,
    exclude_from_projection: data.excludeFromProjection,
  };
}

export async function createRecurring(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = recurringFormSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const row = toRow(parsed.data);
  // Cursor inicial = a própria data de início: o gerador materializa da âncora
  // até hoje (catch-up idempotente, D6). Assim uma recorrência que começa
  // "06/07" gera o 06/07 mesmo que hoje já seja depois — é o que o usuário
  // espera ao escolher a data de início.
  const { error } = await supabase.from("recurring_transactions").insert({
    user_id: user.id,
    ...row,
    next_run_date: row.start_date,
    is_active: true,
  });

  if (error) {
    return fail("Não foi possível criar a recorrência. Tente novamente.");
  }

  revalidatePath("/recorrentes");
  return ok(null);
}

export async function updateRecurring(
  id: unknown,
  input: unknown,
): Promise<ActionResult<null>> {
  const parsedId = recurringIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Recorrência inválida.");

  const parsed = recurringFormSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const row = toRow(parsed.data);

  // Só recalcula o cursor se a AGENDA mudou (início/frequência/intervalo);
  // uma edição de valor/descrição não deve pular ocorrências.
  const { data: existing } = await supabase
    .from("recurring_transactions")
    .select("start_date, frequency, interval_count, next_run_date")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (!existing) return fail("Recorrência não encontrada.");

  const scheduleChanged =
    existing.start_date !== row.start_date ||
    existing.frequency !== row.frequency ||
    existing.interval_count !== row.interval_count;
  // Mudou a agenda → re-ancora no novo início (mesma regra da criação).
  // Só valor/descrição/categoria → mantém o cursor (não repõe ocorrências).
  const nextRun = scheduleChanged ? row.start_date : existing.next_run_date;

  const { error, count } = await supabase
    .from("recurring_transactions")
    .update({ ...row, next_run_date: nextRun }, { count: "exact" })
    .eq("id", parsedId.data);

  if (error) {
    return fail("Não foi possível salvar a recorrência. Tente novamente.");
  }
  if (count === 0) return fail("Recorrência não encontrada.");

  revalidatePath("/recorrentes");
  return ok(null);
}

export async function setRecurringActive(
  id: unknown,
  isActive: boolean,
): Promise<ActionResult<null>> {
  const parsedId = recurringIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Recorrência inválida.");

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  // Ao retomar, pula o período pausado: o cursor vai para a próxima
  // ocorrência de hoje em diante (não materializa o intervalo pausado).
  const patch: {
    is_active: boolean;
    next_run_date?: string;
  } = { is_active: isActive };

  if (isActive) {
    const { data: existing } = await supabase
      .from("recurring_transactions")
      .select("start_date, frequency, interval_count")
      .eq("id", parsedId.data)
      .maybeSingle();
    if (existing) {
      patch.next_run_date = firstRunOnOrAfter(
        existing.start_date,
        existing.frequency,
        existing.interval_count,
        todayISO(),
      );
    }
  }

  const { error, count } = await supabase
    .from("recurring_transactions")
    .update(patch, { count: "exact" })
    .eq("id", parsedId.data);

  if (error) return fail("Não foi possível atualizar a recorrência.");
  if (count === 0) return fail("Recorrência não encontrada.");

  revalidatePath("/recorrentes");
  return ok(null);
}

export async function deleteRecurring(
  id: unknown,
): Promise<ActionResult<null>> {
  const parsedId = recurringIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Recorrência inválida.");

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  // transactions.recurring_id é ON DELETE SET NULL: os lançamentos já gerados
  // permanecem (só perdem o vínculo). Sem RESTRICT aqui.
  const { error, count } = await supabase
    .from("recurring_transactions")
    .delete({ count: "exact" })
    .eq("id", parsedId.data);

  if (error) {
    return fail("Não foi possível excluir a recorrência. Tente novamente.");
  }
  if (count === 0) return fail("Recorrência não encontrada.");

  revalidatePath("/recorrentes");
  return ok(null);
}

/**
 * Gera agora os lançamentos devidos, em vez de esperar o cron diário.
 * Reusa a MESMA função SQL do pg_cron (`generate_recurring_transactions`) via
 * service role — EXECUTE é revogado de `authenticated`, então precisa do admin
 * client. Idêntico ao job (idempotente pelo índice único), sem reimplementar a
 * lógica no app. Exige usuário logado para disparar.
 */
export async function runRecurringGeneration(): Promise<
  ActionResult<{ generated: number }>
> {
  const { user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return fail(
      "Geração manual indisponível: SUPABASE_SERVICE_ROLE_KEY não configurada.",
    );
  }

  const { data, error } = await admin.rpc("generate_recurring_transactions");
  if (error) {
    return fail("Não foi possível gerar os lançamentos. Tente novamente.");
  }

  revalidatePath("/recorrentes");
  revalidatePath("/transacoes");
  revalidatePath("/contas");
  revalidatePath("/cartoes");
  return ok({ generated: data ?? 0 });
}
