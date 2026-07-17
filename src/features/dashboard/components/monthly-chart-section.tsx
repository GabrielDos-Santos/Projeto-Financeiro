import { getMonthlySeries } from "../queries";
import { IncomeExpenseBarChart } from "@/components/charts/income-expense-bar-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export async function MonthlyChartSection() {
  const data = await getMonthlySeries(6);
  const hasData = data.some((p) => p.incomeCents > 0 || p.expenseCents > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Receitas × Despesas</CardTitle>
        <CardDescription>Últimos 6 meses (valores pagos).</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <IncomeExpenseBarChart data={data} />
        ) : (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Sem movimentações pagas nos últimos meses.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
