import { z } from "zod";

const MAX_MONEY_CENTS = 999_999_999_999;
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data");

export const goalFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da meta")
    .max(80, "Máximo de 80 caracteres"),
  description: z
    .string()
    .trim()
    .max(280, "Máximo de 280 caracteres")
    .optional(),
  targetAmountCents: z
    .number("Informe o valor da meta")
    .int("Valor inválido")
    .min(1, "Informe o valor da meta")
    .max(MAX_MONEY_CENTS, "Valor muito alto"),
  targetDate: z.union([dateOnly, z.literal("")]).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Cor inválida"),
  icon: z.string().trim().min(1, "Escolha um ícone").max(50, "Ícone inválido"),
});

export type GoalFormInput = z.infer<typeof goalFormSchema>;

export const goalIdSchema = z.uuid("Meta inválida");

export const contributeSchema = z.object({
  amountCents: z
    .number("Informe o valor")
    .int("Valor inválido")
    .min(1, "Informe o valor")
    .max(MAX_MONEY_CENTS, "Valor muito alto"),
});

export type ContributeInput = z.infer<typeof contributeSchema>;
