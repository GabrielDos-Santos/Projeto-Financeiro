"use client";

import { formatMonthShortBR } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  buildProjectionRows,
  type MonthStatus,
  type ProjectionMonth,
} from "@/services/projection";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<MonthStatus, string> = {
  ok: "OK",
  tight: "Apertado",
  negative: "Negativo",
};

const STATUS_CLASS: Record<MonthStatus, string> = {
  ok: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  tight: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  negative: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

export function StatusBadge({ status }: { status: MonthStatus }) {
  return (
    <Badge variant="outline" className={cn("border-0", STATUS_CLASS[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

function Amount({
  cents,
  muted = false,
}: {
  cents: number;
  muted?: boolean;
}) {
  if (cents === 0) {
    return <span className="text-muted-foreground/40">—</span>;
  }
  return (
    <span
      className={cn(
        "tabular-nums",
        muted && "text-muted-foreground",
        !muted && cents < 0 && "text-rose-600 dark:text-rose-400",
        !muted && cents > 0 && "text-emerald-600 dark:text-emerald-400",
      )}
    >
      {formatCents(Math.abs(cents))}
    </span>
  );
}

/**
 * A grade da planilha: linhas = fontes (Salário, Fatura Nubank, Faculdade…),
 * colunas = meses, rodapé = saldo do mês / acumulado / situação.
 * Em telas estreitas vira uma pilha de cards por mês (checklist da Fase 15).
 */
export function ProjectionTable({
  months,
  startingBalanceCents,
}: {
  months: ProjectionMonth[];
  startingBalanceCents: number;
}) {
  const incomeRows = buildProjectionRows(months, "income");
  const expenseRows = buildProjectionRows(months, "expense");

  return (
    <>
      {/* Desktop: grade rolável horizontalmente, 1ª coluna fixa. */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b">
              <th className="sticky left-0 z-10 bg-card py-2 pr-4 text-left font-medium">
                Categoria
              </th>
              {months.map((month) => (
                <th
                  key={month.monthISO}
                  className="px-3 py-2 text-right font-medium capitalize"
                >
                  {formatMonthShortBR(month.monthISO)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            <tr className="border-b bg-muted/30">
              <td
                className="sticky left-0 z-10 bg-muted/30 py-1.5 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                colSpan={months.length + 1}
              >
                Receitas
              </td>
            </tr>
            {incomeRows.length === 0 ? (
              <tr className="border-b">
                <td
                  className="py-2 pr-4 text-muted-foreground"
                  colSpan={months.length + 1}
                >
                  Nenhuma receita prevista.
                </td>
              </tr>
            ) : (
              incomeRows.map((row) => (
                <tr key={row.groupId} className="border-b last:border-0">
                  <td className="sticky left-0 z-10 max-w-[220px] truncate bg-card py-2 pr-4">
                    {row.label}
                  </td>
                  {row.amountsByMonth.map((cents, index) => (
                    <td
                      key={months[index]!.monthISO}
                      className="px-3 py-2 text-right"
                    >
                      <Amount cents={cents} />
                    </td>
                  ))}
                </tr>
              ))
            )}

            <tr className="border-b bg-muted/30">
              <td
                className="sticky left-0 z-10 bg-muted/30 py-1.5 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                colSpan={months.length + 1}
              >
                Despesas
              </td>
            </tr>
            {expenseRows.length === 0 ? (
              <tr className="border-b">
                <td
                  className="py-2 pr-4 text-muted-foreground"
                  colSpan={months.length + 1}
                >
                  Nenhuma despesa prevista.
                </td>
              </tr>
            ) : (
              expenseRows.map((row) => (
                <tr key={row.groupId} className="border-b last:border-0">
                  <td className="sticky left-0 z-10 max-w-[220px] truncate bg-card py-2 pr-4">
                    {row.label}
                    {row.source === "simulation" && (
                      <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-600 dark:text-amber-400">
                        simulação
                      </span>
                    )}
                  </td>
                  {row.amountsByMonth.map((cents, index) => (
                    <td
                      key={months[index]!.monthISO}
                      className="px-3 py-2 text-right"
                    >
                      <Amount cents={cents} />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>

          <tfoot className="border-t-2">
            <tr className="border-b">
              <td className="sticky left-0 z-10 bg-card py-2 pr-4 font-medium">
                Saldo do mês
              </td>
              {months.map((month) => (
                <td
                  key={month.monthISO}
                  className="px-3 py-2 text-right font-medium"
                >
                  <Amount cents={month.simulatedNetCents ?? month.netCents} />
                </td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="sticky left-0 z-10 bg-card py-2 pr-4 font-semibold">
                Saldo acumulado
              </td>
              {months.map((month) => (
                <td
                  key={month.monthISO}
                  className="px-3 py-2 text-right font-semibold tabular-nums"
                >
                  {formatCents(
                    month.simulatedCumulativeCents ?? month.cumulativeCents,
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td className="sticky left-0 z-10 bg-card py-2 pr-4 font-medium">
                Situação
              </td>
              {months.map((month) => (
                <td key={month.monthISO} className="px-3 py-2 text-right">
                  <StatusBadge status={month.simulatedStatus ?? month.status} />
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">
          Partindo de {formatCents(startingBalanceCents)} hoje nas contas ativas.
        </p>
      </div>

      {/* Mobile: um card por mês. */}
      <div className="space-y-3 md:hidden">
        {months.map((month) => (
          <div key={month.monthISO} className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium capitalize">
                {formatMonthShortBR(month.monthISO)}
              </span>
              <StatusBadge status={month.simulatedStatus ?? month.status} />
            </div>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Receitas</dt>
                <dd>
                  <Amount
                    cents={month.simulatedIncomeCents ?? month.incomeCents}
                  />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Despesas</dt>
                <dd>
                  <Amount
                    cents={-(month.simulatedExpenseCents ?? month.expenseCents)}
                  />
                </dd>
              </div>
              <div className="flex justify-between border-t pt-1">
                <dt className="text-muted-foreground">Saldo do mês</dt>
                <dd>
                  <Amount cents={month.simulatedNetCents ?? month.netCents} />
                </dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt>Acumulado</dt>
                <dd className="tabular-nums">
                  {formatCents(
                    month.simulatedCumulativeCents ?? month.cumulativeCents,
                  )}
                </dd>
              </div>
            </dl>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          Partindo de {formatCents(startingBalanceCents)} hoje nas contas ativas.
        </p>
      </div>
    </>
  );
}
