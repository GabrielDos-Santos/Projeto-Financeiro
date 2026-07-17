import { addMonths } from "date-fns";

import { parseDateOnly, toDateOnly } from "@/lib/dates";
import { splitInstallments } from "@/lib/money";

/**
 * Plano de parcelas (D4): divisão exata do total (resto distribuído pela
 * `splitInstallments`) + vencimentos mensais ANCORADOS na primeira parcela
 * (sempre `addMonths(âncora, k)` — 31/01 rende 28/02 e 31/03, sem drift).
 * Puro e sem React: usado pelo preview (client) e pela Server Action.
 */

export type InstallmentPlanItem = {
  number: number;
  amountCents: number;
  dueDate: string; // "YYYY-MM-DD"
};

export function buildInstallmentPlan(
  totalCents: number,
  count: number,
  firstDueDate: string,
): InstallmentPlanItem[] {
  const amounts = splitInstallments(totalCents, count);
  const anchor = parseDateOnly(firstDueDate);
  return amounts.map((amountCents, index) => ({
    number: index + 1,
    amountCents,
    dueDate: toDateOnly(addMonths(anchor, index)),
  }));
}
