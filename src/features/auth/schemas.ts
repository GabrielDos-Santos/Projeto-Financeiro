import { z } from "zod";

/** Trim/lowercase ANTES da validação de formato (comportamento do zod v4). */
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(255, "Máximo de 255 caracteres")
  .pipe(z.email("E-mail inválido"));

/** Senha forte: 8–72 chars (limite do bcrypt), com letra e número. */
const passwordSchema = z
  .string()
  .min(8, "Mínimo de 8 caracteres")
  .max(72, "Máximo de 72 caracteres")
  .regex(/\p{L}/u, "Inclua ao menos uma letra")
  .regex(/\d/, "Inclua ao menos um número");

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Informe seu nome")
      .max(100, "Máximo de 100 caracteres"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe a senha"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
