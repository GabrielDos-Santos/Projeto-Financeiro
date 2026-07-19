import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { getRecentImportBatches } from "@/features/import/queries";
import { ImportHub } from "@/features/import/components/import-hub";
import type {
  AccountOption,
  CardOption,
  CategoryOption,
} from "@/features/transactions/types";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Importar dados" };

export default async function ImportarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const myUserId = user?.id ?? "";

  // O import escreve sempre no próprio usuário: os seletores de contexto e a
  // revisão só podem oferecer contas/cartões/categorias DELE — a RLS da Fase
  // 16 traria também as dos membros para o admin (decisão 96).
  const [accountsResult, categoriesResult, cardsResult, recentBatches] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("id, name")
        .eq("user_id", myUserId)
        .eq("is_archived", false)
        .order("name"),
      supabase
        .from("categories")
        .select("id, name, type, color, icon")
        .eq("user_id", myUserId)
        .eq("is_archived", false)
        .order("name"),
      supabase
        .from("credit_cards")
        .select("id, name, closing_day, due_day, invoice_name_by_due_month")
        .eq("user_id", myUserId)
        .eq("is_archived", false)
        .order("name"),
      getRecentImportBatches(),
    ]);

  const accounts: AccountOption[] = accountsResult.data ?? [];
  const categories: CategoryOption[] = categoriesResult.data ?? [];
  const cards: CardOption[] = (cardsResult.data ?? []).map((card) => ({
    id: card.id,
    name: card.name,
    closingDay: card.closing_day,
    dueDay: card.due_day,
    invoiceNameByDueMonth: card.invoice_name_by_due_month,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Importar dados"
        description="Traga seu histórico financeiro para o app sem bagunçar o saldo atual."
      />
      <ImportHub
        accounts={accounts}
        cards={cards}
        categories={categories}
        recentBatches={recentBatches}
      />
    </div>
  );
}
