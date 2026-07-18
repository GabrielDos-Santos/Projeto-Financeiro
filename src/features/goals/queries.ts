import { createClient } from "@/lib/supabase/server";
import type { Goal } from "./types";

/** Metas do usuário — ativas primeiro, depois concluídas, arquivadas por último. */
export async function getGoals(): Promise<Goal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Falha ao carregar as metas.");
  }

  const order: Record<Goal["status"], number> = {
    active: 0,
    completed: 1,
    archived: 2,
  };
  return [...data].sort((a, b) => order[a.status] - order[b.status]);
}
