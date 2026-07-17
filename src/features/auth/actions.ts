"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { sanitizeNextPath } from "@/lib/utils";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "./schemas";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function signUp(input: unknown): Promise<ActionResult<null>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    if (error.status === 429) {
      return fail("Muitas tentativas. Aguarde alguns minutos.");
    }
    // Mensagem genérica: não revela se o e-mail já existe.
    return fail("Não foi possível criar a conta. Verifique os dados.");
  }

  // Com confirmação de e-mail ativa não há sessão ainda:
  // o client mostra a tela "confira seu e-mail".
  return ok(null);
}

export async function signIn(
  input: unknown,
  next?: string,
): Promise<ActionResult<null>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.status === 429) {
      return fail("Muitas tentativas. Aguarde alguns minutos.");
    }
    if (error.code === "email_not_confirmed") {
      return fail("Confirme seu e-mail antes de entrar. Confira sua caixa.");
    }
    // Genérica de propósito — não revela se o e-mail existe (ARQUITETURA.md §6).
    return fail("E-mail ou senha inválidos.");
  }

  revalidatePath("/", "layout");
  redirect(sanitizeNextPath(next));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function forgotPassword(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${siteUrl()}/auth/callback?next=/redefinir-senha` },
  );

  if (error && error.status === 429) {
    return fail("Muitas tentativas. Aguarde alguns minutos.");
  }

  // Resposta idêntica exista ou não o e-mail (anti-enumeração).
  return ok(null);
}

export async function updatePassword(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return fail("Sessão expirada. Solicite um novo link de redefinição.");
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    if (error.code === "same_password") {
      return fail("A nova senha precisa ser diferente da atual.");
    }
    return fail("Não foi possível atualizar a senha. Tente novamente.");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
