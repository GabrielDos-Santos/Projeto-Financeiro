import { z } from "zod";

const MAX_MONEY_CENTS = 999_999_999_999;

export const budgetFormSchema = z.object({
  categoryId: z.uuid("Escolha a categoria"),
  /** Sempre o 1º dia do mês (CHECK do banco). */
  month: z.string().regex(/^\d{4}-\d{2}-01$/, "Mês inválido"),
  amountCents: z
    .number("Informe o teto")
    .int("Valor inválido")
    .min(1, "Informe o teto")
    .max(MAX_MONEY_CENTS, "Valor muito alto"),
  /** Fração 0.05–1.00 (CHECK do banco); default 0.80. */
  alertThreshold: z
    .number("Informe o alerta")
    .min(0.05, "Mínimo de 5%")
    .max(1, "Máximo de 100%"),
});

export type BudgetFormInput = z.infer<typeof budgetFormSchema>;

export const budgetIdSchema = z.uuid("Orçamento inválido");
