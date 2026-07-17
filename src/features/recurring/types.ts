import type { Tables } from "@/types/database";
import type { Frequency } from "@/services/recurrence";

export type Recurring = Tables<"recurring_transactions">;

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: "dia",
  weekly: "semana",
  monthly: "mês",
  yearly: "ano",
};

const FREQUENCY_PLURALS: Record<Frequency, string> = {
  daily: "dias",
  weekly: "semanas",
  monthly: "meses",
  yearly: "anos",
};

/** "Mensal", "Semanal" ou "A cada 2 semanas". */
export function frequencyLabel(
  frequency: Frequency,
  intervalCount: number,
): string {
  if (intervalCount === 1) {
    switch (frequency) {
      case "daily":
        return "Diária";
      case "weekly":
        return "Semanal";
      case "monthly":
        return "Mensal";
      case "yearly":
        return "Anual";
    }
  }
  return `A cada ${intervalCount} ${FREQUENCY_PLURALS[frequency]}`;
}
