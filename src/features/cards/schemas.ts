import { z } from "zod";

const MAX_MONEY_CENTS = 999_999_999_999;

export const cardFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do cartão")
    .max(60, "Máximo de 60 caracteres"),
  bank: z.string().trim().max(60, "Máximo de 60 caracteres").optional(),
  limitCents: z
    .number("Informe o limite")
    .int("Valor inválido")
    .min(1, "Informe o limite")
    .max(MAX_MONEY_CENTS, "Valor muito alto"),
  closingDay: z
    .number("Informe o dia de fechamento")
    .int()
    .min(1, "Entre 1 e 28")
    .max(28, "Entre 1 e 28"),
  dueDay: z
    .number("Informe o dia de vencimento")
    .int()
    .min(1, "Entre 1 e 28")
    .max(28, "Entre 1 e 28"),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Cor inválida"),
  icon: z.string().trim().min(1, "Escolha um ícone").max(50, "Ícone inválido"),
});

export type CardFormInput = z.infer<typeof cardFormSchema>;

export const cardIdSchema = z.uuid("Cartão inválido");

/** Pagar fatura: cria a despesa na conta escolhida e quita a fatura (D5). */
export const payInvoiceSchema = z.object({
  invoiceId: z.uuid("Fatura inválida"),
  accountId: z.uuid("Escolha a conta de pagamento"),
  categoryId: z.uuid("Escolha a categoria"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data do pagamento"),
});

export type PayInvoiceInput = z.infer<typeof payInvoiceSchema>;

export const invoiceIdSchema = z.uuid("Fatura inválida");
