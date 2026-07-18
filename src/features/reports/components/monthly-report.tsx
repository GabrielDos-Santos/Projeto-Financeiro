import { formatDateBR } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import type { MonthlyReportData } from "../types";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoneyDisplay } from "@/components/shared/money-display";
import { EmptyState } from "@/components/shared/empty-state";
import { Receipt } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  paid: "Pago",
  pending: "Pendente",
  cancelled: "Cancelada",
};

function signedCents(type: string, amountCents: number): number {
  return type === "expense" ? -amountCents : amountCents;
}

export function MonthlyReport({ data }: { data: MonthlyReportData }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-1">
            <p className="text-sm text-muted-foreground">Receitas pagas</p>
            <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
              {formatCents(data.incomePaidCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1">
            <p className="text-sm text-muted-foreground">Despesas pagas</p>
            <p className="text-xl font-semibold text-red-600 dark:text-red-400">
              {formatCents(data.expensePaidCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1">
            <p className="text-sm text-muted-foreground">Resultado</p>
            <MoneyDisplay
              cents={data.netPaidCents}
              colorBySign
              className="text-xl font-semibold"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lançamentos do mês</CardTitle>
          <CardDescription>
            {data.entries.length} lançamento(s), excluindo cancelados.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2">
          {data.entries.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Nenhum lançamento neste mês"
              className="border-none shadow-none"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Conta/Cartão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.entries.map((entry, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground">
                      {formatDateBR(entry.date)}
                    </TableCell>
                    <TableCell className="max-w-64 truncate">
                      {entry.description}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.categoryName}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.sourceName}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {STATUS_LABELS[entry.status] ?? entry.status}
                    </TableCell>
                    <TableCell className="text-right">
                      <MoneyDisplay
                        cents={signedCents(entry.type, entry.amountCents)}
                        colorBySign={entry.status !== "cancelled"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
