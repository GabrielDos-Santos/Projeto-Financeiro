import { z } from "zod";

const MAX_MONEY_CENTS = 999_999_999_999;

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data");

const baseFields = {
  description: z
    .string()
    .trim()
    .min(1, "Informe a descrição")
    .max(120, "Máximo de 120 caracteres"),
  amountCents: z
    .number("Informe o valor")
    .int("Valor inválido")
    .min(1, "Informe o valor")
    .max(MAX_MONEY_CENTS, "Valor muito alto"),
  date: dateOnlySchema,
  status: z.enum(["paid", "pending"], "Status inválido"),
  notes: z.string().trim().max(500, "Máximo de 500 caracteres").optional(),
};

/** Receita ou despesa em conta (compra em cartão entra na Fase 6). */
export const entryFormSchema = z.object({
  ...baseFields,
  type: z.enum(["income", "expense"], "Tipo inválido"),
  accountId: z.uuid("Escolha a conta"),
  categoryId: z.uuid("Escolha a categoria"),
});

/** Transferência entre contas — vira par espelhado (D3). */
export const transferFormSchema = z
  .object({
    ...baseFields,
    fromAccountId: z.uuid("Escolha a conta de origem"),
    toAccountId: z.uuid("Escolha a conta de destino"),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: "A conta de destino precisa ser diferente da origem",
    path: ["toAccountId"],
  });

export type EntryFormInput = z.infer<typeof entryFormSchema>;
export type TransferFormInput = z.infer<typeof transferFormSchema>;

export const transactionIdSchema = z.uuid("Lançamento inválido");
export const transferGroupIdSchema = z.uuid("Transferência inválida");

export const entryStatusSchema = z.enum(
  ["paid", "pending", "cancelled"],
  "Status inválido",
);
