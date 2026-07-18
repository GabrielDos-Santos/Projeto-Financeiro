import type { Tables } from "@/types/database";

export type Budget = Tables<"budgets">;

/** Linha da view `v_budget_usage` — orçamento + consumo por competência. */
export type BudgetUsage = Tables<"v_budget_usage">;

/** Informação do alerta devolvida às Server Actions de despesa (toast). */
export type BudgetAlert = {
  categoryName: string;
  usagePct: number;
};
