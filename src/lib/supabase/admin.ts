import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Client com a **service role** — IGNORA RLS. Só no servidor, e só onde é
 * estritamente necessário chamar funções/tabelas que os clientes não podem
 * (ex.: `generate_recurring_transactions()`, com EXECUTE revogado de
 * `authenticated`). NUNCA importe isto em código de client (`"use client"`).
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
