import { z } from "zod";

import { CURRENCY_OPTIONS, LOCALE_OPTIONS } from "./types";

export const profileFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Informe seu nome")
    .max(100, "Máximo de 100 caracteres"),
  // "" (sem avatar) ou uma URL válida — nunca .transform() aqui: quebra o
  // resolver do RHF (mesmo problema da Fase 7 com `end_date`). A conversão
  // "" → null acontece na Server Action, não no schema do formulário.
  avatarUrl: z.union([z.url("URL inválida"), z.literal("")]),
});

export type ProfileFormInput = z.infer<typeof profileFormSchema>;

export const preferencesFormSchema = z.object({
  currency: z.enum(CURRENCY_OPTIONS, "Moeda inválida"),
  locale: z.enum(LOCALE_OPTIONS, "Idioma inválido"),
  notifyBudgetAlerts: z.boolean(),
  notifyInvoiceDue: z.boolean(),
  notifyLoanDue: z.boolean(),
});

export type PreferencesFormInput = z.infer<typeof preferencesFormSchema>;

/** Mesma regra de força da Fase 1 (features/auth/schemas.ts) — duplicada de
 * propósito: alterar senha logado não depende do fluxo de auth pública. */
const passwordSchema = z
  .string()
  .min(8, "Mínimo de 8 caracteres")
  .max(72, "Máximo de 72 caracteres")
  .regex(/\p{L}/u, "Inclua ao menos uma letra")
  .regex(/\d/, "Inclua ao menos um número");

export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type ChangePasswordFormInput = z.infer<typeof changePasswordFormSchema>;

export const deleteAccountSchema = z.object({
  // Retorno anotado como `boolean` de propósito: sem isso, o TS 5.5+ infere
  // um type predicate a partir de `v === "EXCLUIR"` e o zod estreita o tipo
  // de saída para o literal "EXCLUIR" — quebra o resolver do RHF (default "").
  confirmation: z
    .string()
    .refine((v): boolean => v === "EXCLUIR", "Digite EXCLUIR para confirmar"),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
