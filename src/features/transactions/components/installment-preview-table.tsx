"use client";

import { formatDateBR } from "@/lib/dates";
import { buildInstallmentPlan } from "@/services/installments";
import { MoneyDisplay } from "@/components/shared/money-display";

/** Preview do plano de parcelas antes de salvar (soma = total exato, D1). */
export function InstallmentPreviewTable({
  totalCents,
  count,
  firstDueDate,
}: {
  totalCents: number;
  count: number;
  firstDueDate: string;
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
                  {item.number}/{count}
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
