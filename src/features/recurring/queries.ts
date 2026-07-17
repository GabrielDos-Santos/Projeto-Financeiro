import { createClient } from "@/lib/supabase/server";
import type { Recurring } from "./types";

/** Templates recorrentes do usuário — ativos primeiro, depois por descrição. */
export async function getRecurring(): Promise<Recurring[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recurring_transactions")
    .select("*")
    .order("is_active", { ascending: false })
    .order("description", { ascending: true });

  if (error) {
    throw new Error("Falha ao carregar as recorrências.");
  }
  return data;
}
