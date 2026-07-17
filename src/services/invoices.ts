import { addMonths, getDate, setDate } from "date-fns";

import { parseDateOnly, toDateOnly } from "@/lib/dates";

/**
 * Competência da fatura (D5) — espelho client de `compute_invoice_period()`
 * (migration 0006). Usado só para PREVIEW; a verdade é o SQL na Server Action.
 *
 *   dia(compra) > fechamento → fatura do mês seguinte; senão, do mês da compra.
 *   vencimento: dia D do mês de referência; se D <= C, cai no mês seguinte.
 */
export type InvoicePeriod = {
  referenceMonth: string; // "YYYY-MM-01"
  closingDate: string;
  dueDate: string;
};

export function computeInvoicePeriod(
  closingDay: number,
  dueDay: number,
  purchaseISO: string,
): InvoicePeriod {
  const purchase = parseDateOnly(purchaseISO);
  const refBase =
    getDate(purchase) > closingDay ? addMonths(purchase, 1) : purchase;
  const referenceMonth = setDate(refBase, 1);
  const closingDate = setDate(refBase, closingDay);
  const dueBase = dueDay > closingDay ? refBase : addMonths(refBase, 1);
  const dueDate = setDate(dueBase, dueDay);

  return {
    referenceMonth: toDateOnly(referenceMonth),
    closingDate: toDateOnly(closingDate),
    dueDate: toDateOnly(dueDate),
  };
}
