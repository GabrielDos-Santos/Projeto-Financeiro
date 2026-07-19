import { z } from "zod";

export const createHouseholdSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Mínimo de 2 caracteres")
    .max(80, "Máximo de 80 caracteres"),
});

// Padrão do projeto para e-mail (decisão 16): valida o formato DEPOIS dos
// transforms encadeados via pipe.
export const inviteMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("E-mail inválido")),
});

export const shareAccountSchema = z.object({
  accountId: z.uuid("Conta inválida"),
});

export const inviteIdSchema = z.uuid("Convite inválido");
export const memberIdSchema = z.uuid("Membro inválido");
export const sharedAccountIdSchema = z.uuid("Compartilhamento inválido");

/** Token cru do link — base64url de 32 bytes (43 chars), nunca vai ao banco. */
export const inviteTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{40,64}$/, "Convite inválido");

export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type ShareAccountInput = z.infer<typeof shareAccountSchema>;
