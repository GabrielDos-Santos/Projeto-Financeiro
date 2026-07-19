import { z } from "zod";

const MAX_MONEY_CENTS = 999_999_999_999;
const MAX_ROWS = 500;
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

// 120 (mesmo teto do lançamento manual, Fase 4) é curto demais pra extrato
// bancário real: Pix costuma vir com razão social + CNPJ + banco + agência +
// conta na descrição, passando de 120 chars com frequência (bug reportado
// pelo usuário — a linha era rejeitada na confirmação sem dizer o motivo).
// Sem CHECK de tamanho no banco (`transactions.description` é `text` puro),
// só o Zod limitava — 300 dá bastante margem sem abrir pra texto arbitrário.
const IMPORT_DESCRIPTION_MAX = 300;

const importRowSchema = z.object({
  date: dateOnly,
  description: z.string().trim().min(1).max(IMPORT_DESCRIPTION_MAX),
  amountCents: z.number().int().min(1).max(MAX_MONEY_CENTS),
  type: z.enum(["income", "expense"]),
  categoryId: z.uuid("Categoria inválida"),
  status: z.enum(["paid", "pending"]),
  affectsBalance: z.boolean(),
});

/** Confirmação do import de extrato de CONTA. */
export const importAccountSchema = z.object({
  accountId: z.uuid("Escolha a conta"),
  fileName: z.string().trim().min(1).max(255),
  rows: z
    .array(importRowSchema)
    .min(1, "Nenhuma linha para importar")
    .max(MAX_ROWS, `Máximo de ${MAX_ROWS} linhas`),
});

export type ImportAccountInput = z.infer<typeof importAccountSchema>;

/** Confirmação do import de FATURA de cartão (competência única). */
export const importCardSchema = z.object({
  creditCardId: z.uuid("Escolha o cartão"),
  referenceMonth: z.string().regex(/^\d{4}-\d{2}-01$/, "Mês inválido"),
  fileName: z.string().trim().min(1).max(255),
  rows: z
    .array(importRowSchema.omit({ type: true, affectsBalance: true }))
    .min(1, "Nenhuma linha para importar")
    .max(MAX_ROWS, `Máximo de ${MAX_ROWS} linhas`),
});

export type ImportCardInput = z.infer<typeof importCardSchema>;

export const importBatchIdSchema = z.uuid("Importação inválida");

const analyzeRowSchema = z.object({
  date: dateOnly,
  description: z.string().trim().min(1).max(IMPORT_DESCRIPTION_MAX),
  amountCents: z.number().int().min(1).max(MAX_MONEY_CENTS),
});

/** Checagem de duplicatas antes da revisão final (não muta nada). */
export const analyzeImportRowsSchema = z.object({
  contextId: z.uuid("Contexto inválido"), // account_id ou credit_card_id
  rows: z.array(analyzeRowSchema).max(MAX_ROWS),
});

export type AnalyzeImportRowsInput = z.infer<typeof analyzeImportRowsSchema>;
