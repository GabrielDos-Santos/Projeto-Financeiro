import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { fetchEntriesPage } from "@/features/transactions/queries";
import { TransactionsView } from "@/features/transactions/components/transactions-view";
import type {
  AccountOption,
  CardOption,
  CategoryOption,
} from "@/features/transactions/types";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Transações" };

export default async function TransacoesPage() {
  const supabase = await createClient();

  const [accountsResult, categoriesResult, cardsResult, firstPage] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("id, name")
        .eq("is_archived", false)
        .order("name"),
      supabase
        .from("categories")
        .select("id, name, type, color, icon")
        .eq("is_archived", false)
        .order("name"),
      supabase
        .from("credit_cards")
        .select("id, name, closing_day, due_day")
        .eq("is_archived", false)
        .order("name"),
      fetchEntriesPage(supabase, {}, null),
    ]);

  const accounts: AccountOption[] = accountsResult.data ?? [];
  const categories: CategoryOption[] = categoriesResult.data ?? [];
  const cards: CardOption[] = (cardsResult.data ?? []).map((card) => ({
    id: card.id,
    name: card.name,
    closingDay: card.closing_day,
    dueDay: card.due_day,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Transações"
        description="Receitas, despesas, cartão e transferências — pagos movem o saldo; pendentes ficam previstos."
      />
      <TransactionsView
        accounts={accounts}
        categories={categories}
        cards={cards}
        initialFirstPage={firstPage}
      />
    </div>
  );
}
