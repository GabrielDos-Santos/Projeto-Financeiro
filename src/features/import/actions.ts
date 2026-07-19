"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { todayISO } from "@/lib/dates";
import { maybeBudgetAlert } from "@/features/budgets/alert";
import { computeImportHash } from "@/services/import/hash";
import type { CategoryHistoryEntry } from "@/services/import/category-suggestion";
import { getCategorySuggestionSource } from "./queries";
import {
  analyzeImportRowsSchema,
  importAccountSchema,
  importBatchIdSchema,
  importCardSchema,
} from "./schemas";

/** Wrapper de Server Action: `queries.ts` usa `lib/supabase/server` (next/headers),
 * que não pode ser importado direto por um Client Component (o wizard). */
export async function fetchCategorySuggestionSource(): Promise<
  ActionResult<CategoryHistoryEntry[]>
> {
  const source = await getCategorySuggestionSource();
  return ok(source);
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Guarda da etapa 1 do wizard (contexto): bloqueia import para uma fatura
 * já paga — inserir item ali violaria o estado (docs/…HISTORICO.md, caso 4).
 */
export async function checkCardImportContext(
  creditCardId: unknown,
  referenceMonth: unknown,
): Promise<ActionResult<{ blocked: boolean }>> {
  const parsedCard = z.uuid().safeParse(creditCardId);
  const parsedMonth = z
    .string()
    .regex(/^\d{4}-\d{2}-01$/)
    .safeParse(referenceMonth);
  if (!parsedCard.success || !parsedMonth.success) {
    return fail("Contexto inválido.");
  }

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { data: invoice } = await supabase
    .from("credit_card_invoices")
    .select("status")
    .eq("credit_card_id", parsedCard.data)
    .eq("reference_month", parsedMonth.data)
    .maybeSingle();

  return ok({ blocked: invoice?.status === "paid" });
}

/**
 * Dedup não-bloqueante (decisão 60): calcula o hash de cada linha e checa
 * contra `import_hash` de importações anteriores e contra lançamentos
 * manuais (mesmo contexto+data+valor, sem `import_batch_id`). Só sinaliza —
 * a linha nasce desmarcada na revisão, o usuário decide.
 */
export async function analyzeImportRows(
  input: unknown,
): Promise<ActionResult<{ duplicates: boolean[] }>> {
  const parsed = analyzeImportRowsSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos.");

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const hashes = await Promise.all(
    parsed.data.rows.map((row) =>
      computeImportHash(
        parsed.data.contextId,
        row.date,
        row.amountCents,
        row.description,
      ),
    ),
  );

  const rowDates = parsed.data.rows.map((r) => r.date).sort();
  const minDate = rowDates[0];
  const maxDate = rowDates[rowDates.length - 1];

  const [hashMatches, manualMatches] = await Promise.all([
    hashes.length > 0
      ? supabase
          .from("transactions")
          .select("import_hash")
          .eq("user_id", user.id)
          .in("import_hash", hashes)
      : Promise.resolve({ data: [] as { import_hash: string | null }[] }),
    minDate && maxDate
      ? supabase
          .from("transactions")
          .select("date, amount_cents")
          .eq("user_id", user.id)
          .is("import_batch_id", null)
          .gte("date", minDate)
          .lte("date", maxDate)
          .or(
            `account_id.eq.${parsed.data.contextId},credit_card_id.eq.${parsed.data.contextId}`,
          )
      : Promise.resolve({ data: [] as { date: string; amount_cents: number }[] }),
  ]);

  const existingHashes = new Set(
    (hashMatches.data ?? [])
      .map((r) => r.import_hash)
      .filter((h): h is string => h != null),
  );
  const manualKeys = new Set(
    (manualMatches.data ?? []).map((r) => `${r.date}|${r.amount_cents}`),
  );

  const duplicates = parsed.data.rows.map((row, i) => {
    const manualKey = `${row.date}|${row.amountCents}`;
    return existingHashes.has(hashes[i]!) || manualKeys.has(manualKey);
  });

  return ok({ duplicates });
}

/** Reconciliação única de alerta de orçamento pós-import (decisão 63) —
 * só o MÊS CORRENTE, uma vez por categoria distinta tocada. */
async function reconcileBudgetAlertsForCurrentMonth(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  rows: { date: string; type: string; categoryId: string }[],
) {
  const currentMonth = todayISO().slice(0, 7);
  const touched = new Map<string, string>(); // categoryId -> uma data qualquer do mês
  for (const row of rows) {
    if (row.type !== "expense") continue;
    if (row.date.slice(0, 7) !== currentMonth) continue;
    touched.set(row.categoryId, row.date);
  }
  for (const [categoryId, date] of touched) {
    await maybeBudgetAlert(supabase, userId, categoryId, date);
  }
}

/** Confirma o import de extrato de CONTA (entrada a). */
export async function importAccountEntries(
  input: unknown,
): Promise<ActionResult<{ imported: number; batchId: string }>> {
  const parsed = importAccountSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise as linhas.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { data: allowed } = await supabase.rpc("check_rate_limit", {
    p_key: `${user.id}:import`,
    // TEMPORÁRIO: 50/h pro backfill inicial do usuário (histórico de várias
    // faturas). Reverter para 10/h (decisão 58) depois do primeiro uso.
    p_max_hits: 50,
    p_window: "1 hour",
  });
  if (allowed === false) {
    return fail("Muitas importações em pouco tempo. Aguarde e tente de novo.");
  }

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      user_id: user.id,
      kind: "account_csv",
      account_id: parsed.data.accountId,
      file_name: parsed.data.fileName,
      row_count: parsed.data.rows.length,
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    return fail("Não foi possível iniciar a importação. Tente novamente.");
  }

  const hashes = await Promise.all(
    parsed.data.rows.map((row) =>
      computeImportHash(
        parsed.data.accountId,
        row.date,
        row.amountCents,
        row.description,
      ),
    ),
  );

  // Insert atômico em statement único — chunking só se o teto de 500 subir.
  const { error: insertError } = await supabase.from("transactions").insert(
    parsed.data.rows.map((row, i) => ({
      user_id: user.id,
      account_id: parsed.data.accountId,
      type: row.type,
      status: row.status,
      description: row.description,
      amount_cents: row.amountCents,
      date: row.date,
      paid_at: row.status === "paid" ? new Date(`${row.date}T12:00:00`).toISOString() : null,
      category_id: row.categoryId,
      affects_balance: row.affectsBalance,
      import_batch_id: batch.id,
      import_hash: hashes[i],
    })),
  );

  if (insertError) {
    await supabase.from("import_batches").delete().eq("id", batch.id);
    return fail("Não foi possível importar os lançamentos. Tente novamente.");
  }

  await reconcileBudgetAlertsForCurrentMonth(supabase, user.id, parsed.data.rows);

  revalidatePath("/transacoes");
  revalidatePath("/contas");
  revalidatePath("/dashboard");
  return ok({ imported: parsed.data.rows.length, batchId: batch.id });
}

/** Confirma o import de FATURA de cartão (entrada b) — uma fatura só. */
export async function importCardEntries(
  input: unknown,
): Promise<ActionResult<{ imported: number; batchId: string }>> {
  const parsed = importCardSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise as linhas.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { data: allowed } = await supabase.rpc("check_rate_limit", {
    p_key: `${user.id}:import`,
    // TEMPORÁRIO: 50/h pro backfill inicial do usuário (histórico de várias
    // faturas). Reverter para 10/h (decisão 58) depois do primeiro uso.
    p_max_hits: 50,
    p_window: "1 hour",
  });
  if (allowed === false) {
    return fail("Muitas importações em pouco tempo. Aguarde e tente de novo.");
  }

  // Fatura destino: dia 1 da competência escolhida sempre resolve para o
  // MESMO reference_month (compute_invoice_period nunca empurra o dia 1
  // para o mês seguinte — qualquer closing_day é >= 1).
  const { data: invoiceId, error: invoiceError } = await supabase.rpc(
    "get_or_create_invoice",
    {
      p_credit_card_id: parsed.data.creditCardId,
      p_purchase_date: parsed.data.referenceMonth,
    },
  );
  if (invoiceError || !invoiceId) {
    return fail("Não foi possível abrir a fatura do cartão. Tente novamente.");
  }

  const { data: invoiceStatus } = await supabase
    .from("credit_card_invoices")
    .select("status")
    .eq("id", invoiceId)
    .maybeSingle();
  if (invoiceStatus?.status === "paid") {
    return fail(
      "Esta fatura já está paga. Reabra-a antes de importar mais itens.",
    );
  }

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      user_id: user.id,
      kind: "card_csv",
      credit_card_id: parsed.data.creditCardId,
      reference_month: parsed.data.referenceMonth,
      file_name: parsed.data.fileName,
      row_count: parsed.data.rows.length,
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    return fail("Não foi possível iniciar a importação. Tente novamente.");
  }

  const hashes = await Promise.all(
    parsed.data.rows.map((row) =>
      computeImportHash(
        parsed.data.creditCardId,
        row.date,
        row.amountCents,
        row.description,
      ),
    ),
  );

  const { error: insertError } = await supabase.from("transactions").insert(
    parsed.data.rows.map((row, i) => ({
      user_id: user.id,
      credit_card_id: parsed.data.creditCardId,
      invoice_id: invoiceId,
      type: "expense" as const,
      status: row.status,
      description: row.description,
      amount_cents: row.amountCents,
      date: row.date,
      paid_at: row.status === "paid" ? new Date(`${row.date}T12:00:00`).toISOString() : null,
      category_id: row.categoryId,
      // Cartão nunca entra em v_account_balances (D5) — flag irrelevante
      // para saldo; a proteção acontece no PAGAMENTO da fatura (fork B2).
      affects_balance: true,
      import_batch_id: batch.id,
      import_hash: hashes[i],
    })),
  );

  if (insertError) {
    await supabase.from("import_batches").delete().eq("id", batch.id);
    return fail("Não foi possível importar as compras. Tente novamente.");
  }

  await reconcileBudgetAlertsForCurrentMonth(
    supabase,
    user.id,
    parsed.data.rows.map((row) => ({ ...row, type: "expense" })),
  );

  revalidatePath("/transacoes");
  revalidatePath("/cartoes");
  revalidatePath(`/cartoes/${parsed.data.creditCardId}`);
  revalidatePath("/dashboard");
  return ok({ imported: parsed.data.rows.length, batchId: batch.id });
}

/**
 * Desfaz uma importação: apaga as transações do lote e o lote (decisão 61).
 * Bloqueado se a fatura destino foi paga DEPOIS do import (reabrir primeiro
 * — evita apagar transações que uma fatura paga já referencia via itens).
 */
export async function undoImport(
  batchId: unknown,
): Promise<ActionResult<null>> {
  const parsedId = importBatchIdSchema.safeParse(batchId);
  if (!parsedId.success) return fail("Importação inválida.");

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { data: batch } = await supabase
    .from("import_batches")
    .select("id, kind, credit_card_id, reference_month")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (!batch) return fail("Importação não encontrada.");

  if (batch.kind === "card_csv" && batch.credit_card_id && batch.reference_month) {
    const { data: invoice } = await supabase
      .from("credit_card_invoices")
      .select("status")
      .eq("credit_card_id", batch.credit_card_id)
      .eq("reference_month", batch.reference_month)
      .maybeSingle();
    if (invoice?.status === "paid") {
      return fail(
        "A fatura desta importação já foi paga. Reabra-a antes de desfazer.",
      );
    }
  }

  const { error: deleteTxError } = await supabase
    .from("transactions")
    .delete()
    .eq("import_batch_id", parsedId.data);
  if (deleteTxError) {
    return fail("Não foi possível desfazer a importação. Tente novamente.");
  }

  await supabase.from("import_batches").delete().eq("id", parsedId.data);

  revalidatePath("/transacoes");
  revalidatePath("/contas");
  revalidatePath("/cartoes");
  revalidatePath("/dashboard");
  revalidatePath("/transacoes/importar");
  return ok(null);
}
