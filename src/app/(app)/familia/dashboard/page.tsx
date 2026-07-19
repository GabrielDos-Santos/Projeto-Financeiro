import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { formatMonthBR, todayISO } from "@/lib/dates";
import {
  getHouseholdDashboard,
  getMyHousehold,
} from "@/features/households/queries";
import { formatCents } from "@/lib/money";
import { IncomeExpenseBarChart } from "@/components/charts/income-expense-bar-chart";
import { CategoryDonutChart } from "@/components/charts/category-donut-chart";
import { PageHeader } from "@/components/layout/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { StatCard } from "@/components/shared/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard da família" };

const FALLBACK_SLICE_COLOR = "#71717a";

export default async function FamiliaDashboardPage() {
  const data = await getMyHousehold();
  if (!data) redirect("/familia");

  const { summary, breakdown, series } = await getHouseholdDashboard(
    data.household.id,
  );

  const currentMonthLabel = formatMonthBR(`${todayISO().slice(0, 7)}-01`);
  const incomePaid = summary?.income_paid_cents ?? 0;
  const expensePaid = summary?.expense_paid_cents ?? 0;

  const chartData = series.map((point) => ({
    label: formatMonthBR(point.month).split(" ")[0]!.slice(0, 3),
    incomeCents: point.income_paid_cents,
    expenseCents: point.expense_paid_cents,
  }));
  const donutData = breakdown.map((slice) => ({
    name: slice.category_name,
    color: slice.category_color ?? FALLBACK_SLICE_COLOR,
    amountCents: slice.amount_cents,
  }));
  const breakdownTotal = breakdown.reduce((s, b) => s + b.amount_cents, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Família · ${data.household.name}`}
        description={`Totais da casa em ${currentMonthLabel} — soma de todos os membros, sem detalhe por conta.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Receitas do mês"
          icon={TrendingUp}
          hint="Recebidas (pagas), casa inteira"
        >
          <MoneyDisplay
            cents={incomePaid}
            className="text-emerald-600 dark:text-emerald-400"
          />
        </StatCard>
        <StatCard
          label="Despesas do mês"
          icon={TrendingDown}
          hint="Pagas, casa inteira"
        >
          <MoneyDisplay
            cents={expensePaid}
            className="text-red-600 dark:text-red-400"
          />
        </StatCard>
        <StatCard
          label="Resultado do mês"
          icon={Wallet}
          hint="Receitas − despesas pagas"
        >
          <MoneyDisplay cents={incomePaid - expensePaid} colorBySign />
        </StatCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receitas × Despesas</CardTitle>
              <CardDescription>
                Últimos 6 meses (valores pagos), casa inteira.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.some(
                (p) => p.incomeCents > 0 || p.expenseCents > 0,
              ) ? (
                <IncomeExpenseBarChart data={chartData} />
              ) : (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  Sem movimentações pagas nos últimos meses.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gastos por categoria</CardTitle>
            <CardDescription>
              Mês atual — categorias com o mesmo nome somam juntas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {donutData.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Nenhuma despesa neste mês.
              </p>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <CategoryDonutChart data={donutData} />
                <ul className="w-full space-y-1.5">
                  {donutData.slice(0, 6).map((slice) => {
                    const pct =
                      breakdownTotal > 0
                        ? Math.round((slice.amountCents / breakdownTotal) * 100)
                        : 0;
                    return (
                      <li
                        key={slice.name}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: slice.color }}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {slice.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {pct}%
                        </span>
                        <span className="tabular-nums">
                          {formatCents(slice.amountCents)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
