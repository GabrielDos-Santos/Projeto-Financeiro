"use client";

import { formatDateBR } from "@/lib/dates";
import { buildInstallmentPlan } from "@/services/installments";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/shared/money-display";

/** Preview do plano de parcelas antes de salvar (soma = total exato, D1).
 * `paidCount` (Fase 17, reconstrução de parcelamento em andamento) marca as
 * primeiras N parcelas como já pagas/históricas — 0 preserva o preview normal. */
export function InstallmentPreviewTable({
  totalCents,
  count,
  firstDueDate,
  paidCount = 0,
}: {
  totalCents: number;
  count: number;
  firstDueDate: string;
  paidCount?: number;
}) {
  if (count < 2 || totalCents < count || !firstDueDate) return null;

  const plan = buildInstallmentPlan(totalCents, count, firstDueDate);

  return (
    <div className="rounded-md border">
      <div className="max-h-44 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="px-3 py-1.5 text-left font-medium">Parcela</th>
              <th className="px-3 py-1.5 text-left font-medium">Vencimento</th>
              <th className="px-3 py-1.5 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {plan.map((item) => (
              <tr key={item.number} className="border-b last:border-0">
                <td className="px-3 py-1.5 text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    {item.number}/{count}
                    {item.number <= paidCount && (
                      <Badge variant="outline" className="h-4 px-1 text-[10px]">
                        Paga
                      </Badge>
                    )}
                  </span>
                </td>
                <td className="px-3 py-1.5">{formatDateBR(item.dueDate)}</td>
                <td className="px-3 py-1.5 text-right">
                  <MoneyDisplay cents={item.amountCents} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between border-t px-3 py-1.5 text-xs text-muted-foreground">
        <span>Total</span>
        <MoneyDisplay cents={totalCents} className="font-medium" />
      </div>
    </div>
  );
}
