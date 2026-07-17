import { createClient } from "@/lib/supabase/server";
import type { Category } from "./types";

/** Todas as categorias do usuário — ativas primeiro, depois por nome. */
export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("is_archived", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Falha ao carregar as categorias.");
  }
  return data;
}
