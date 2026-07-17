import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { fetchEntriesPage } from "@/features/transactions/queries";
import { TransactionsView } from "@/features/transactions/components/transactions-view";
import type {
  AccountOption,
  CategoryOption,
} from "@/features/transactions/types";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Transações" };

export default async function TransacoesPage() {
  const supabase = await createClient();

  const [accountsResult, categoriesResult, firstPage] = await Promise.all([
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
    fetchEntriesPage(supabase, {}, null),
  ]);

  const accounts: AccountOption[] = accountsResult.data ?? [];
  const categories: CategoryOption[] = categoriesResult.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Transações"
        description="Receitas, despesas e transferências — pagos movem o saldo; pendentes ficam previstos."
      />
      <TransactionsView
        accounts={accounts}
        categories={categories}
        initialFirstPage={firstPage}
      />
    </div>
  );
}
