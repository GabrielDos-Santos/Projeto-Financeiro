"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import {
  changePasswordFormSchema,
  deleteAccountSchema,
  preferencesFormSchema,
  profileFormSchema,
} from "./schemas";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function updateProfile(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = profileFormSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const avatarUrl = parsed.data.avatarUrl || null;

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, avatar_url: avatarUrl })
    .eq("id", user.id);
  if (error) {
    return fail("Não foi possível salvar o perfil. Tente novamente.");
  }

  // A Topbar/UserMenu leem o nome de `user_metadata` (mesmo campo do
  // signup) — sem isso, o cabeçalho ficaria com o nome antigo até relogar.
  await supabase.auth.updateUser({
    data: { full_name: parsed.data.fullName },
  });

  revalidatePath("/", "layout");
  revalidatePath("/configuracoes");
  return ok(null);
}

export async function updatePreferences(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = preferencesFormSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { error } = await supabase
    .from("settings")
    .update({
      currency: parsed.data.currency,
      locale: parsed.data.locale,
      notify_budget_alerts: parsed.data.notifyBudgetAlerts,
      notify_invoice_due: parsed.data.notifyInvoiceDue,
      notify_loan_due: parsed.data.notifyLoanDue,
    })
    .eq("user_id", user.id);
  if (error) {
    return fail("Não foi possível salvar as preferências. Tente novamente.");
  }

  revalidatePath("/configuracoes");
  return ok(null);
}

export async function changePassword(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = changePasswordFormSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const { supabase, user } = await requireUser();
  if (!user?.email) return fail("Sessão expirada. Entre novamente.");

  // Reautenticação (ARQUITETURA.md §6): confirma a senha atual antes de trocar.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (reauthError) {
    return fail("Senha atual incorreta.", {
      currentPassword: ["Senha atual incorreta"],
    });
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (error) {
    if (error.code === "same_password") {
      return fail("A nova senha precisa ser diferente da atual.", {
        newPassword: ["A nova senha precisa ser diferente da atual"],
      });
    }
    return fail("Não foi possível atualizar a senha. Tente novamente.");
  }

  return ok(null);
}

/** Remove todos os anexos do usuário no bucket (Storage não cascateia por FK). */
async function deleteAllUserAttachments(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const { data: transactionFolders } = await admin.storage
    .from("attachments")
    .list(userId);
  if (!transactionFolders || transactionFolders.length === 0) return;

  const filePaths: string[] = [];
  for (const entry of transactionFolders) {
    // Entradas com `id` são arquivos; sem `id` são "pastas" (prefixos) —
    // aqui, uma por transaction_id — que precisam ser listadas por dentro.
    if (entry.id) {
      filePaths.push(`${userId}/${entry.name}`);
      continue;
    }
    const { data: files } = await admin.storage
      .from("attachments")
      .list(`${userId}/${entry.name}`);
    for (const file of files ?? []) {
      filePaths.push(`${userId}/${entry.name}/${file.name}`);
    }
  }

  if (filePaths.length > 0) {
    await admin.storage.from("attachments").remove(filePaths);
  }
}

/**
 * Zona de perigo: apaga `auth.users` (cascateia todo o grafo via FK — Fases
 * 2 a 12 inteiras dependem desse `on delete cascade`) + os anexos no Storage
 * (que não têm FK para cascatear). Exige a service role — `authenticated`
 * não tem permissão para `auth.admin.deleteUser`.
 */
export async function deleteAccount(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Digite EXCLUIR (em maiúsculas) para confirmar.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return fail(
      "Exclusão de conta indisponível: SUPABASE_SERVICE_ROLE_KEY não configurada.",
    );
  }

  await deleteAllUserAttachments(admin, user.id);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return fail("Não foi possível excluir a conta. Tente novamente.");
  }

  await supabase.auth.signOut();
  redirect("/login");
}
