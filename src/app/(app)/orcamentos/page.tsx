import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { getBudgetUsage } from "@/features/budgets/queries";
import { BudgetsView } from "@/features/budgets/components/budgets-view";
import { todayISO } from "@/lib/dates";
import type { CategoryOption } from "@/features/transactions/types";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Orçamentos" };

export default async function OrcamentosPage() {
  const month = `${todayISO().slice(0, 7)}-01`;
  const supabase = await createClient();

  const [usage, categoriesResult] = await Promise.all([
    getBudgetUsage(month),
    supabase
      .from("categories")
      .select("id, name, type, color, icon")
      .eq("type", "expense")
      .eq("is_archived", false)
      .order("name"),
  ]);

  const categories: CategoryOption[] = categoriesResult.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Orçamentos"
        description="Tetos mensais por categoria de despesa, com alerta ao se aproximar do limite."
      />
      <BudgetsView
        initialMonth={month}
        initialUsage={usage}
        categories={categories}
      />
    </div>
  );
}
