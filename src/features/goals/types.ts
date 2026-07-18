import type { Tables } from "@/types/database";

export type Goal = Tables<"goals">;

export const GOAL_STATUS_LABELS: Record<Goal["status"], string> = {
  active: "Em andamento",
  completed: "Concluída",
  archived: "Arquivada",
};

/** Progresso 0–100, sem passar de 100 na exibição (aporte pode superar a meta). */
export function goalProgressPct(goal: Goal): number {
  if (goal.target_amount_cents <= 0) return 0;
  return Math.min(
    100,
    Math.round((goal.current_amount_cents / goal.target_amount_cents) * 100),
  );
}
