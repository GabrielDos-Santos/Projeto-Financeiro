import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
} from "date-fns";

import { parseDateOnly, toDateOnly } from "@/lib/dates";
import type { Database } from "@/types/database";

/**
 * Cálculo de ocorrências recorrentes (D6) — espelho client de
 * `advance_occurrence()` (migration 0006). SOMENTE para preview/UX; a
 * materialização real é a função SQL rodada pelo pg_cron.
 *
 * A k-ésima ocorrência é sempre calculada da ÂNCORA (`start_date`), nunca do
 * cursor — mensal criada dia 31 rende 31/01, 28/02, 31/03… sem "drift".
 */
export type Frequency = Database["public"]["Enums"]["recurrence_freq"];

const FREQUENCY_STEP_DAYS: Partial<Record<Frequency, number>> = {
  daily: 1,
  weekly: 7,
};

/** k-ésima ocorrência a partir da âncora (`k = 0` → a própria âncora). */
export function advanceOccurrence(
  startISO: string,
  frequency: Frequency,
  intervalCount: number,
  k: number,
): string {
  const start = parseDateOnly(startISO);
  const step = intervalCount * k;
  switch (frequency) {
    case "daily":
      return toDateOnly(addDays(start, step));
    case "weekly":
      return toDateOnly(addWeeks(start, step));
    case "monthly":
      return toDateOnly(addMonths(start, step));
    case "yearly":
      return toDateOnly(addYears(start, step));
  }
}

/**
 * Primeira ocorrência em/depois de `fromISO`. Se a âncora já é futura,
 * retorna a própria âncora. É o valor de `next_run_date` na criação/retomada:
 * evita materializar todo o histórico passado de uma vez.
 */
export function firstRunOnOrAfter(
  startISO: string,
  frequency: Frequency,
  intervalCount: number,
  fromISO: string,
): string {
  const start = parseDateOnly(startISO);
  const from = parseDateOnly(fromISO);
  if (start >= from) return startISO;

  // Salto analítico para daily/weekly (senão seriam milhares de iterações);
  // monthly/yearly iteram (poucos passos).
  let k = 0;
  const stepDays = FREQUENCY_STEP_DAYS[frequency];
  if (stepDays) {
    const diff = differenceInCalendarDays(from, start);
    k = Math.max(0, Math.floor(diff / (stepDays * intervalCount)));
  }
  let occ = advanceOccurrence(startISO, frequency, intervalCount, k);
  while (occ < fromISO && k < 100_000) {
    k += 1;
    occ = advanceOccurrence(startISO, frequency, intervalCount, k);
  }
  return occ;
}

/**
 * Próximas `count` ocorrências em/depois de `fromISO` (default hoje),
 * respeitando `end_date`. Para o preview do formulário e da lista.
 */
export function nextOccurrences(
  startISO: string,
  frequency: Frequency,
  intervalCount: number,
  endISO: string | null,
  fromISO: string,
  count: number,
): string[] {
  const result: string[] = [];
  const first = firstRunOnOrAfter(startISO, frequency, intervalCount, fromISO);
  if (endISO && first > endISO) return result;

  // Descobre o k da primeira ocorrência para continuar a partir dele.
  let k = 0;
  while (
    advanceOccurrence(startISO, frequency, intervalCount, k) < first &&
    k < 100_000
  ) {
    k += 1;
  }

  let occ = first;
  while (result.length < count && k < 100_000) {
    if (endISO && occ > endISO) break;
    result.push(occ);
    k += 1;
    occ = advanceOccurrence(startISO, frequency, intervalCount, k);
  }
  return result;
}
