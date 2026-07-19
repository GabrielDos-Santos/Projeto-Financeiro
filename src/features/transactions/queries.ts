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

/**
 * Ordenação da lista. `date` é a competência/vencimento (não created_at, que
 * a view não expõe) — então "mais antigas" ordenado por data crescente é
 * justamente o que traz à tona as parcelas/pendências mais atrasadas quando
 * combinado com o filtro de status = pendente. `amount` usa `amount_cents`
 * (sempre positivo; o sinal vem do tipo), ou seja, ordena por VALOR absoluto.
 */
export const ENTRY_SORT_OPTIONS = [
  { value: "date_desc", label: "Mais recentes" },
  { value: "date_asc", label: "Mais antigas" },
  { value: "amount_desc", label: "Maior valor" },
  { value: "amount_asc", label: "Menor valor" },
] as const;
export type EntrySort = (typeof ENTRY_SORT_OPTIONS)[number]["value"];
export const DEFAULT_ENTRY_SORT: EntrySort = "date_desc";

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
  sort: EntrySort = DEFAULT_ENTRY_SORT,
): Promise<EntriesPage> {
  // `id` desc como desempate estável mantém a paginação por offset sem pular
  // nem repetir linha quando a chave primária de ordenação tem empates.
  const [column, ascending] =
    sort === "date_asc"
      ? (["date", true] as const)
      : sort === "amount_desc"
        ? (["amount_cents", false] as const)
        : sort === "amount_asc"
          ? (["amount_cents", true] as const)
          : (["date", false] as const);

  let query = supabase
    .from("v_entries")
    .select("*", { count: "exact" })
    .order(column, { ascending })
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
