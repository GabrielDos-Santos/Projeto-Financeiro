import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";

/**
 * Backup completo em JSON — todas as tabelas de domínio do usuário, via RLS
 * (nunca a service role: é leitura, o próprio `createClient()` já restringe
 * às linhas do usuário). Sempre server-side, mesmo motivo da Fase 11.
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
    supabase.from("profiles").select("*").maybeSingle(),
    supabase.from("settings").select("*").maybeSingle(),
    supabase.from("accounts").select("*"),
    supabase.from("categories").select("*"),
    supabase.from("credit_cards").select("*"),
    supabase.from("transactions").select("*"),
    supabase.from("transaction_installments").select("*"),
    supabase.from("credit_card_invoices").select("*"),
    supabase.from("recurring_transactions").select("*"),
    supabase.from("budgets").select("*"),
    supabase.from("goals").select("*"),
    // Metadados só — o arquivo em si fica no Storage (fora do escopo do backup).
    supabase
      .from("attachments")
      .select(
        "id, transaction_id, file_name, mime_type, size_bytes, created_at",
      ),
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
