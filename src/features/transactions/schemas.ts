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

/** Compra parcelada em conta (D4) — cartão parcelado entra na Fase 6. */
export const installmentPurchaseSchema = z
  .object({
    description: baseFields.description,
    amountCents: baseFields.amountCents, // valor TOTAL da compra
    installmentsTotal: z
      .number("Informe as parcelas")
      .int("Parcelas inválidas")
      .min(2, "Mínimo de 2 parcelas")
      .max(120, "Máximo de 120 parcelas"),
    date: dateOnlySchema, // data da compra (competência da mãe)
    firstDueDate: dateOnlySchema, // vencimento da 1ª parcela (âncora)
    accountId: z.uuid("Escolha a conta"),
    categoryId: z.uuid("Escolha a categoria"),
    notes: baseFields.notes,
  })
  .refine((data) => data.amountCents >= data.installmentsTotal, {
    message: "Valor total muito baixo para esse número de parcelas",
    path: ["amountCents"],
  });

/** Compra à vista NO CARTÃO (D5) — vira expense com credit_card_id + invoice_id. */
export const cardPurchaseSchema = z.object({
  description: baseFields.description,
  amountCents: baseFields.amountCents,
  date: dateOnlySchema, // data da compra → define a fatura (competência)
  creditCardId: z.uuid("Escolha o cartão"),
  categoryId: z.uuid("Escolha a categoria"),
  notes: baseFields.notes,
});

/** Compra parcelada no cartão — mãe + N parcelas, cada uma na fatura do seu mês. */
export const cardInstallmentPurchaseSchema = z
  .object({
    description: baseFields.description,
    amountCents: baseFields.amountCents, // valor TOTAL
    installmentsTotal: z
      .number("Informe as parcelas")
      .int("Parcelas inválidas")
      .min(2, "Mínimo de 2 parcelas")
      .max(120, "Máximo de 120 parcelas"),
    date: dateOnlySchema, // data da compra
    creditCardId: z.uuid("Escolha o cartão"),
    categoryId: z.uuid("Escolha a categoria"),
    notes: baseFields.notes,
  })
  .refine((data) => data.amountCents >= data.installmentsTotal, {
    message: "Valor total muito baixo para esse número de parcelas",
    path: ["amountCents"],
  });

export type EntryFormInput = z.infer<typeof entryFormSchema>;
export type TransferFormInput = z.infer<typeof transferFormSchema>;
export type InstallmentPurchaseInput = z.infer<
  typeof installmentPurchaseSchema
>;
export type CardPurchaseInput = z.infer<typeof cardPurchaseSchema>;
export type CardInstallmentPurchaseInput = z.infer<
  typeof cardInstallmentPurchaseSchema
>;

export const installmentIdSchema = z.uuid("Parcela inválida");

export const transactionIdSchema = z.uuid("Lançamento inválido");
export const transferGroupIdSchema = z.uuid("Transferência inválida");

export const entryStatusSchema = z.enum(
  ["paid", "pending", "cancelled"],
  "Status inválido",
);

/** Espelha os CHECKs de `attachments` (whitelist de mime + 10 MB). */
export const ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

export const ATTACHMENT_MAX_BYTES = 10_485_760; // 10 MB

export const attachmentMetaSchema = z.object({
  transactionId: z.uuid("Lançamento inválido"),
  fileName: z
    .string()
    .trim()
    .min(1, "Nome do arquivo inválido")
    .max(255, "Nome do arquivo muito longo"),
  storagePath: z.string().min(1).max(500),
  mimeType: z.enum(ATTACHMENT_MIME_TYPES, "Tipo de arquivo não permitido"),
  sizeBytes: z
    .number()
    .int()
    .min(1, "Arquivo vazio")
    .max(ATTACHMENT_MAX_BYTES, "O arquivo excede 10 MB"),
});

export type AttachmentMetaInput = z.infer<typeof attachmentMetaSchema>;

export const attachmentIdSchema = z.uuid("Anexo inválido");
