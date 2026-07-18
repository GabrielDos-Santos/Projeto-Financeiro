import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { Entry } from "./types";

/**
 * Fetcher isomórfico da lista (recebe o client do contexto): o RSC de
 * /transacoes entrega a primeira página e o TanStack Query pagina o resto
 * com o client de browser (D8). Fonte: view `v_entries` (camada canônica).
 *
 * Paginação por OFFSET (`.range()` + `count: "exact"`), não mais keyset: o
 * usuário pediu página numerada com limite configurável (25/50/75/100), o
 * que exige saber o total de páginas — algo que keyset não dá de graça.
 * Volume de dados de um único usuário é pequeno o bastante para offset não
 * ser um problema de performance real aqui.
 */

export const ENTRIES_PAGE_SIZE_OPTIONS = [25, 50, 75, 100] as const;
export type EntriesPageSize = (typeof ENTRIES_PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_ENTRIES_PAGE_SIZE: EntriesPageSize = 25;

export type EntryFilters = {
  search?: string;
  type?: "income" | "expense" | "transfer";
  status?: "paid" | "pending" | "cancelled";
  accountId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
};

export type EntriesPage = {
  entries: Entry[];
  totalCount: number;
};

export async function fetchEntriesPage(
  supabase: SupabaseClient<Database>,
  filters: EntryFilters,
  page: number,
  pageSize: EntriesPageSize,
): Promise<EntriesPage> {
  let query = supabase
    .from("v_entries")
    .select("*", { count: "exact" })
    .order("date", { ascending: false })
    .order("id", { ascending: false });

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

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) {
    throw new Error("Falha ao carregar os lançamentos.");
  }

  return { entries: data, totalCount: count ?? 0 };
}
