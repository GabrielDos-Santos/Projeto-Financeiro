import { formatMonthBR } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import type { AnnualReportData } from "../types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoneyDisplay } from "@/components/shared/money-display";

export function AnnualReport({ data }: { data: AnnualReportData }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-1">
            <p className="text-sm text-muted-foreground">Receitas do ano</p>
            <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
              {formatCents(data.totalIncomeCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1">
            <p className="text-sm text-muted-foreground">Despesas do ano</p>
            <p className="text-xl font-semibold text-red-600 dark:text-red-400">
              {formatCents(data.totalExpenseCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1">
            <p className="text-sm text-muted-foreground">Resultado</p>
            <MoneyDisplay
              cents={data.totalNetCents}
              colorBySign
              className="text-xl font-semibold"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meses de {data.year}</CardTitle>
          <CardDescription>Valores pagos, por competência.</CardDescription>
        </CardHeader>
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Receitas</TableHead>
                <TableHead className="text-right">Despesas</TableHead>
                <TableHead className="text-right">Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.months.map((month) => (
                <TableRow key={month.month}>
                  <TableCell className="capitalize">
                    {formatMonthBR(month.month)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCents(month.incomeCents)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCents(month.expenseCents)}
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyDisplay cents={month.netCents} colorBySign />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-medium">Total</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCents(data.totalIncomeCents)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCents(data.totalExpenseCents)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  <MoneyDisplay cents={data.totalNetCents} colorBySign />
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
