import { createClient } from "@/lib/supabase/server";
import type { AccountWithBalance } from "./types";

/**
 * Contas com saldo derivado (view `v_account_balances`, decisão D2).
 * Ativas primeiro, depois por nome. RLS garante que só vêm as do usuário.
 */
export async function getAccountsWithBalances(): Promise<AccountWithBalance[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_account_balances")
    .select("*")
    .order("is_archived", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Falha ao carregar as contas.");
  }
  return data;
}
