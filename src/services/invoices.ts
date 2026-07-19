import { addMonths, getDate, setDate, subMonths } from "date-fns";

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

/**
 * Mês como o NOME da fatura aparece pro usuário (migration 0013): por
 * competência (padrão) ou por vencimento, se o cartão tiver
 * `invoice_name_by_due_month`. Usado em telas que deixam o usuário escolher
 * um mês vendo o mesmo rótulo da timeline (ex.: contexto do import de
 * fatura) — sem isso, "competência" e "nome exibido" divergem 1 mês nos
 * cartões com vencimento menor que o fechamento (ex.: Sicredi).
 */
export function invoiceLabelMonth(
  closingDay: number,
  dueDay: number,
  referenceMonthISO: string,
  labelByDueMonth: boolean,
): string {
  if (!labelByDueMonth) return referenceMonthISO;
  const { dueDate } = computeInvoicePeriod(
    closingDay,
    dueDay,
    referenceMonthISO,
  );
  return toDateOnly(setDate(parseDateOnly(dueDate), 1));
}

/**
 * Inversa de `invoiceLabelMonth`: dado o mês que o usuário escolheu vendo o
 * NOME exibido da fatura, devolve o `reference_month` (competência) real a
 * gravar/consultar. Só desloca quando `labelByDueMonth` está ligado E o
 * cartão tem vencimento <= fechamento (único caso em que o nome exibido
 * diverge da competência) — testa os dois meses candidatos em vez de supor
 * "sempre -1 mês" para não depender da configuração do cartão.
 */
export function resolveReferenceMonthForLabel(
  closingDay: number,
  dueDay: number,
  labelMonthISO: string,
  labelByDueMonth: boolean,
): string {
  if (!labelByDueMonth) return labelMonthISO;
  const candidates = [
    labelMonthISO,
    toDateOnly(subMonths(parseDateOnly(labelMonthISO), 1)),
  ];
  const match = candidates.find(
    (candidate) =>
      invoiceLabelMonth(closingDay, dueDay, candidate, true) ===
      labelMonthISO,
  );
  return match ?? labelMonthISO;
}
