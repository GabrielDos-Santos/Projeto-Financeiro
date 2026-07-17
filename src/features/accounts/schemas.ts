import { z } from "zod";

import { Constants } from "@/types/database";

const MAX_MONEY_CENTS = 999_999_999_999; // ~R$ 10 bilhões, folga sobre o BIGINT

export const accountFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da conta")
    .max(60, "Máximo de 60 caracteres"),
  type: z.enum(Constants.public.Enums.account_type, "Tipo inválido"),
  initialBalanceCents: z
    .number("Valor inválido")
    .int("Valor inválido")
    .min(-MAX_MONEY_CENTS, "Valor muito alto")
    .max(MAX_MONEY_CENTS, "Valor muito alto"),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Cor inválida"),
  icon: z.string().trim().min(1, "Escolha um ícone").max(50, "Ícone inválido"),
});

export type AccountFormInput = z.infer<typeof accountFormSchema>;

export const accountIdSchema = z.uuid("Conta inválida");
