import { z } from "zod";

import { Constants } from "@/types/database";

const MAX_MONEY_CENTS = 999_999_999_999;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data");

export const recurringFormSchema = z
  .object({
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
    type: z.enum(["income", "expense"], "Tipo inválido"),
    categoryId: z.uuid("Escolha a categoria"),
    /** Fonte do lançamento — conta OU cartão (cartão só para despesa). */
    ownerKind: z.enum(["account", "card"], "Fonte inválida"),
    accountId: z.string().optional(),
    creditCardId: z.string().optional(),
    frequency: z.enum(
      Constants.public.Enums.recurrence_freq,
      "Frequência inválida",
    ),
    intervalCount: z
      .number("Informe o intervalo")
      .int("Intervalo inválido")
      .min(1, "Mínimo de 1")
      .max(365, "Máximo de 365"),
    startDate: dateOnly,
    // A UI usa null quando não há fim (nunca ""); o DatePicker/limpar cuidam disso.
    endDate: dateOnly.nullable(),
    /** Fora da projeção de saldo (`/projecao`) — não afeta mais nada. */
    excludeFromProjection: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.ownerKind === "account") {
      if (!data.accountId || !UUID_RE.test(data.accountId)) {
        ctx.addIssue({
          code: "custom",
          path: ["accountId"],
          message: "Escolha a conta",
        });
      }
    } else {
      if (!data.creditCardId || !UUID_RE.test(data.creditCardId)) {
        ctx.addIssue({
          code: "custom",
          path: ["creditCardId"],
          message: "Escolha o cartão",
        });
      }
      if (data.type !== "expense") {
        ctx.addIssue({
          code: "custom",
          path: ["type"],
          message: "Cartão só aceita despesa",
        });
      }
    }
    if (data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "O fim precisa ser depois do início",
      });
    }
  });

export type RecurringFormInput = z.infer<typeof recurringFormSchema>;

export const recurringIdSchema = z.uuid("Recorrência inválida");
