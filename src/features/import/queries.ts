import { createClient } from "@/lib/supabase/server";
import type { CategoryHistoryEntry } from "@/services/import/category-suggestion";
import type { ImportBatch } from "./types";

/** Últimos lotes de import — para o botão "Desfazer" continuar disponível
 * mesmo depois que o usuário sai da tela de confirmação (sem expiração). */
export async function getRecentImportBatches(): Promise<ImportBatch[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("import_batches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw new Error("Falha ao carregar as importações.");
  return data;
}

/**
 * Histórico de descrições + categoria (últimos 300 lançamentos categorizados)
 * — base para a sugestão por palavra-chave da etapa de revisão (decisão 59).
 * Roda uma vez por sessão de import, no client, sobre este retorno.
 */
export async function getCategorySuggestionSource(): Promise<
  CategoryHistoryEntry[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("description, category_id")
    .not("category_id", "is", null)
    .order("date", { ascending: false })
    .limit(300);
  if (error) throw new Error("Falha ao carregar o histórico de categorias.");
  return data
    .filter((row): row is { description: string; category_id: string } =>
      Boolean(row.category_id),
    )
    .map((row) => ({ description: row.description, categoryId: row.category_id }));
}
