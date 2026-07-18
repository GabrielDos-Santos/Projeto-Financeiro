import { createClient } from "@/lib/supabase/server";
import type { BudgetUsage } from "./types";

/** Orçamentos + consumo do mês (view `v_budget_usage`), maiores usos primeiro. */
export async function getBudgetUsage(monthISO: string): Promise<BudgetUsage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_budget_usage")
    .select("*")
    .eq("month", monthISO)
    .order("usage_ratio", { ascending: false });

  if (error) {
    throw new Error("Falha ao carregar os orçamentos.");
  }
  return data;
}
