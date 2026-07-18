import { differenceInCalendarMonths } from "date-fns";

import { parseDateOnly, todayISO } from "@/lib/dates";

export type GoalProjection = {
  monthsRemaining: number;
  remainingCents: number;
  /** Aporte mensal necessário para chegar no alvo até `target_date`. */
  requiredMonthlyCents: number | null;
};

/**
 * Projeção simples (sem histórico de aportes — MVP): quanto falta e, se há
 * `target_date`, o ritmo mensal necessário a partir de hoje.
 */
export function computeGoalProjection(
  currentCents: number,
  targetCents: number,
  targetDateISO: string | null,
): GoalProjection {
  const remainingCents = Math.max(0, targetCents - currentCents);

  if (!targetDateISO) {
    return { monthsRemaining: 0, remainingCents, requiredMonthlyCents: null };
  }

  const months = Math.max(
    1,
    differenceInCalendarMonths(
      parseDateOnly(targetDateISO),
      parseDateOnly(todayISO()),
    ),
  );

  return {
    monthsRemaining: months,
    remainingCents,
    requiredMonthlyCents:
      remainingCents > 0 ? Math.ceil(remainingCents / months) : 0,
  };
}
