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
 * Ordenação da lista.
 * - `created_desc` (padrão): ordem de INSERÇÃO — "o que entrou por último",
 *   igual em espírito às "Últimas movimentações" do dashboard. É o padrão
 *   porque `date` é competência/vencimento e ordenar por data jogava as
 *   parcelas AGENDADAS para o futuro (ex.: 12/12 vencendo em 2027) no topo.
 * - `date_asc`/`date_desc`: por competência — "mais antigas" + status
 *   pendente traz à tona as parcelas/pendências mais atrasadas.
 * - `amount_*`: por `amount_cents` (sempre positivo; sinal vem do tipo) =
 *   valor absoluto.
 */
export const ENTRY_SORT_OPTIONS = [
  { value: "created_desc", label: "Adicionadas por último" },
  { value: "date_desc", label: "Data (mais recente)" },
  { value: "date_asc", label: "Data (mais antiga)" },
  { value: "amount_desc", label: "Maior valor" },
  { value: "amount_asc", label: "Menor valor" },
] as const;
export type EntrySort = (typeof ENTRY_SORT_OPTIONS)[number]["value"];
export const DEFAULT_ENTRY_SORT: EntrySort = "created_desc";

export type EntryFilters = {
  search?: string;
  type?: "income" | "expense" | "transfer";
  status?: "paid" | "pending" | "cancelled";
  accountId?: string;
  categoryId?: string;
  /** Dono do lançamento — só o admin de uma casa filtra por isto (Fase 16). */
  userId?: string;
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
      : sort === "date_desc"
        ? (["date", false] as const)
        : sort === "amount_desc"
          ? (["amount_cents", false] as const)
          : sort === "amount_asc"
            ? (["amount_cents", true] as const)
            : (["created_at", false] as const);

  let query = supabase
    .from("v_entries")
    .select("*", { count: "exact" })
    .order(column, { ascending })
    .order("id", { ascending: false });

  if (filters.type) query = query.eq("type", filters.type);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.userId) query = query.eq("user_id", filters.userId);
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
