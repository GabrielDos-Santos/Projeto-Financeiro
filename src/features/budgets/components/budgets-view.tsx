"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { PiggyBank, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { CategoryOption } from "@/features/transactions/types";
import type { BudgetUsage } from "../types";
import { BudgetCard } from "./budget-card";
import { BudgetFormDialog } from "./budget-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { MonthNav } from "@/components/shared/month-nav";

export function BudgetsView({
  initialMonth,
  initialUsage,
  categories,
}: {
  initialMonth: string;
  initialUsage: BudgetUsage[];
  categories: CategoryOption[];
}) {
  const [month, setMonth] = React.useState(initialMonth);
  const supabase = React.useMemo(() => createClient(), []);
  const isInitialMonth = month === initialMonth;

  const query = useQuery({
    queryKey: ["budget-usage", month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_budget_usage")
        .select("*")
        .eq("month", month)
        .order("usage_ratio", { ascending: false });
      if (error) throw new Error("Falha ao carregar os orçamentos.");
      return data;
    },
    initialData: isInitialMonth ? initialUsage : undefined,
  });

  const usage = query.data ?? [];
  const expenseCategories = categories.filter((c) => c.type === "expense");
  const availableCategories = expenseCategories.filter(
    (c) => !usage.some((b) => b.category_id === c.id),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MonthNav month={month} onMonthChange={setMonth} />
        {availableCategories.length > 0 && (
          <BudgetFormDialog
            month={month}
            availableCategories={availableCategories}
          >
            <Button>
              <Plus /> Novo orçamento
            </Button>
          </BudgetFormDialog>
        )}
      </div>

      {query.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : usage.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="Nenhum orçamento neste mês"
          description="Defina um teto de gasto por categoria — você recebe um aviso ao se aproximar do limite."
        >
          {availableCategories.length > 0 && (
            <BudgetFormDialog
              month={month}
              availableCategories={availableCategories}
            >
              <Button>
                <Plus /> Criar primeiro orçamento
              </Button>
            </BudgetFormDialog>
          )}
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {usage.map((budget) => (
            <BudgetCard
              key={budget.budget_id}
              budget={budget}
              month={month}
              availableCategories={availableCategories}
            />
          ))}
        </div>
      )}
    </div>
  );
}
