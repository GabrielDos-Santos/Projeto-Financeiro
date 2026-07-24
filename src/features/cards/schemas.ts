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
  // Sem .default() de propósito — mesma armadilha das decisões 37/43/52/56
  // com o resolver do RHF; defaultValues sempre fornece `false` explícito.
  invoiceNameByDueMonth: z.boolean(),
});

export type CardFormInput = z.infer<typeof cardFormSchema>;

export const cardIdSchema = z.uuid("Cartão inválido");

/**
 * Pagar fatura (D5): cria a despesa na conta e abate `amountCents` da fatura.
 * O pagamento pode ser PARCIAL — o teto real (≤ restante) é validado no servidor
 * contra o total calculado da fatura; aqui só limitamos o intervalo bruto.
 */
export const payInvoiceSchema = z.object({
  invoiceId: z.uuid("Fatura inválida"),
  accountId: z.uuid("Escolha a conta de pagamento"),
  categoryId: z.uuid("Escolha a categoria"),
  amountCents: z
    .number("Informe o valor a pagar")
    .int("Valor inválido")
    .min(1, "Informe um valor maior que zero")
    .max(MAX_MONEY_CENTS, "Valor muito alto"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data do pagamento"),
  // Fase 17 (decisão 57) — pagamento retroativo de fatura antiga: sem
  // .default() de propósito (armadilha das decisões 37/43/52 com o RHF);
  // o form sempre fornece `true` em defaultValues.
  affectsBalance: z.boolean(),
});

export type PayInvoiceInput = z.infer<typeof payInvoiceSchema>;

export const invoiceIdSchema = z.uuid("Fatura inválida");

/** Remover um pagamento parcial (desfaz aquele lançamento específico). */
export const invoicePaymentIdSchema = z.uuid("Pagamento inválido");
