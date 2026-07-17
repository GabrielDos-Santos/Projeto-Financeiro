import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { Entry } from "./types";

/**
 * Fetcher isomórfico da lista (recebe o client do contexto): o RSC de
 * /transacoes entrega a primeira página e o TanStack Query pagina o resto
 * com o client de browser (D8). Fonte: view `v_entries` (camada canônica).
 */

export const ENTRIES_PAGE_SIZE = 30;

export type EntryFilters = {
  search?: string;
  type?: "income" | "expense" | "transfer";
  status?: "paid" | "pending" | "cancelled";
  accountId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
};

/** Keyset por (date desc, id desc) — estável e O(1), sem offset (§10). */
export type EntriesCursor = { date: string; id: string };

export type EntriesPage = {
  entries: Entry[];
  nextCursor: EntriesCursor | null;
};

export async function fetchEntriesPage(
  supabase: SupabaseClient<Database>,
  filters: EntryFilters,
  cursor: EntriesCursor | null,
): Promise<EntriesPage> {
  let query = supabase
    .from("v_entries")
    .select("*")
    .order("date", { ascending: false })
    .order("id", { ascending: false })
    .limit(ENTRIES_PAGE_SIZE);

  if (filters.type) query = query.eq("type", filters.type);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.from) query = query.gte("date", filters.from);
  if (filters.to) query = query.lte("date", filters.to);
  if (filters.search) {
    // % e _ são curingas do LIKE — removidos para busca literal.
    const term = filters.search.replace(/[%_]/g, "").trim();
    if (term) query = query.ilike("description", `%${term}%`);
  }
  if (cursor) {
    query = query.or(
      `date.lt.${cursor.date},and(date.eq.${cursor.date},id.lt.${cursor.id})`,
    );
  }

  const { data, error } = await query;
  if (error) {
    throw new Error("Falha ao carregar os lançamentos.");
  }

  const last = data.length === ENTRIES_PAGE_SIZE ? data[data.length - 1] : null;
  return {
    entries: data,
    nextCursor:
      last && last.date && last.id ? { date: last.date, id: last.id } : null,
  };
}
