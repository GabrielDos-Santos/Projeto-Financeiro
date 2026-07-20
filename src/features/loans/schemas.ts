import { z } from "zod";

const MAX_MONEY_CENTS = 999_999_999_999;

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data");

const moneyCentsSchema = z
  .number("Informe o valor")
  .int("Valor inválido")
  .min(1, "Informe o valor")
  .max(MAX_MONEY_CENTS, "Valor muito alto");

/**
 * Empréstimo (Fase 18): principal (o que ENTROU) + total (o que SAI, com
 * juros embutidos nas parcelas — decisão 98) + parcelas geradas por
 * `buildInstallmentPlan()` (mesmo motor da Fase 5). `installmentsTotal >= 2`
 * espelha o CHECK `transactions_installment_shape` — não há empréstimo de
 * parcela única na v1 (ver docs/ARQUITETURA-EXPANSAO-EMPRESTIMOS.md).
 *
 * `creditToAccount` sem `.default()` de propósito — mesma armadilha das
 * decisões 37/43/52/56 (input/output divergentes quebram o Control<T> do
 * RHF); `defaultValues` do formulário fornece `false` explícito.
 */
export const loanFormSchema = z
  .object({
    name: z.string().trim().min(1, "Informe o nome").max(120, "Máximo de 120 caracteres"),
    lender: z.string().trim().max(120, "Máximo de 120 caracteres").optional(),
    principalCents: moneyCentsSchema,
    totalCents: moneyCentsSchema,
    installmentsTotal: z
      .number("Informe as parcelas")
      .int("Parcelas inválidas")
      .min(2, "Mínimo de 2 parcelas")
      .max(120, "Máximo de 120 parcelas"),
    interestRate: z
      .number()
      .min(0, "Não pode ser negativa")
      .max(100, "Muito alta — confira o número")
      .optional(),
    contractDate: dateOnlySchema,
    firstDueDate: dateOnlySchema,
    paidCount: z
      .number("Informe quantas parcelas já foram pagas")
      .int("Valor inválido")
      .min(0, "Não pode ser negativo"),
    installmentAccountId: z.uuid("Escolha a conta das parcelas"),
    expenseCategoryId: z.uuid("Escolha a categoria da despesa"),
    creditToAccount: z.boolean(),
    disbursementAccountId: z.uuid("Escolha a conta").optional(),
    disbursementCategoryId: z.uuid("Escolha a categoria da receita").optional(),
    notes: z.string().trim().max(500, "Máximo de 500 caracteres").optional(),
  })
  .refine((data) => data.totalCents >= data.principalCents, {
    message: "O total a pagar não pode ser menor que o principal",
    path: ["totalCents"],
  })
  .refine((data) => data.totalCents >= data.installmentsTotal, {
    message: "Valor total muito baixo para esse número de parcelas",
    path: ["totalCents"],
  })
  .refine((data) => data.paidCount <= data.installmentsTotal, {
    message: "Não pode ser maior que o total de parcelas",
    path: ["paidCount"],
  })
  .refine(
    (data) => !data.creditToAccount || Boolean(data.disbursementAccountId),
    {
      message: "Escolha a conta que recebeu o valor",
      path: ["disbursementAccountId"],
    },
  )
  .refine(
    (data) => !data.creditToAccount || Boolean(data.disbursementCategoryId),
    {
      message: "Escolha a categoria da receita",
      path: ["disbursementCategoryId"],
    },
  );

export type LoanFormInput = z.infer<typeof loanFormSchema>;

export const loanIdSchema = z.uuid("Empréstimo inválido");
