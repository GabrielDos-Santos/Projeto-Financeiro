import type { Tables } from "@/types/database";

export type Category = Tables<"categories">;

export const CATEGORY_TYPE_LABELS: Record<Category["type"], string> = {
  income: "Receita",
  expense: "Despesa",
};
