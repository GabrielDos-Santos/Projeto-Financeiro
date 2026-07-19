import { createClient } from "@/lib/supabase/server";
import type { Category } from "./types";

/**
 * Todas as categorias do usuário — ativas primeiro, depois por nome.
 *
 * `user_id` explícito (não basta a RLS): desde a Fase 16 a policy de SELECT
 * de `categories` é "dono OU admin da casa" (decisão 85), então sem este
 * filtro o admin veria as categorias dos membros misturadas com as dele —
 * como cada usuário ganha as 14 categorias padrão no cadastro, a lista
 * aparecia duplicada. Categoria é sempre pessoal (decisão 96).
 */
export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .order("is_archived", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Falha ao carregar as categorias.");
  }
  return data;
}
