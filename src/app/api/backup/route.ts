import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";

/**
 * Backup completo em JSON — todas as tabelas de domínio DO PRÓPRIO usuário
 * (nunca a service role: é leitura). Sempre server-side, mesmo motivo da
 * Fase 11.
 *
 * ⚠️ `user_id` explícito em toda query (decisão 96): até a Fase 15 bastava a
 * RLS "own rows", mas a policy estendida da Fase 16 (decisão 85) faz o admin
 * de uma casa LER as linhas dos membros — sem estes filtros, o backup
 * "pessoal" dele passaria a exportar as contas, transações e categorias dos
 * outros membros junto.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: allowed, error: rateLimitError } = await supabase.rpc(
    "check_rate_limit",
    { p_key: `${user.id}:backup`, p_max_hits: 5, p_window: "1 hour" },
  );
  if (rateLimitError) {
    return NextResponse.json(
      { error: "Não foi possível verificar o limite de backups." },
      { status: 500 },
    );
  }
  if (!allowed) {
    return NextResponse.json(
      { error: "Muitos backups. Aguarde um pouco e tente de novo." },
      { status: 429 },
    );
  }

  const [
    profile,
    settings,
    accounts,
    categories,
    creditCards,
    transactions,
    installments,
    invoices,
    recurring,
    budgets,
    goals,
    attachments,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("accounts").select("*").eq("user_id", user.id),
    supabase.from("categories").select("*").eq("user_id", user.id),
    supabase.from("credit_cards").select("*").eq("user_id", user.id),
    supabase.from("transactions").select("*").eq("user_id", user.id),
    supabase
      .from("transaction_installments")
      .select("*")
      .eq("user_id", user.id),
    supabase.from("credit_card_invoices").select("*").eq("user_id", user.id),
    supabase.from("recurring_transactions").select("*").eq("user_id", user.id),
    supabase.from("budgets").select("*").eq("user_id", user.id),
    supabase.from("goals").select("*").eq("user_id", user.id),
    // Metadados só — o arquivo em si fica no Storage (fora do escopo do backup).
    supabase
      .from("attachments")
      .select(
        "id, transaction_id, file_name, mime_type, size_bytes, created_at",
      )
      .eq("user_id", user.id),
  ]);

  const backup = {
    exported_at: new Date().toISOString(),
    profile: profile.data,
    settings: settings.data,
    accounts: accounts.data ?? [],
    categories: categories.data ?? [],
    credit_cards: creditCards.data ?? [],
    transactions: transactions.data ?? [],
    transaction_installments: installments.data ?? [],
    credit_card_invoices: invoices.data ?? [],
    recurring_transactions: recurring.data ?? [],
    budgets: budgets.data ?? [],
    goals: goals.data ?? [],
    attachments: attachments.data ?? [],
  };

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="backup-${todayISO()}.json"`,
    },
  });
}
