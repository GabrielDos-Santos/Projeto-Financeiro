"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { hashInviteToken } from "./token";
import {
  createHouseholdSchema,
  inviteIdSchema,
  inviteMemberSchema,
  inviteTokenSchema,
  memberIdSchema,
  shareAccountSchema,
  sharedAccountIdSchema,
} from "./schemas";

function revalidate() {
  revalidatePath("/familia");
  revalidatePath("/familia/dashboard");
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Casa ativa do usuário (v1: uma). */
async function getMyMembership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data } = await supabase
    .from("household_members")
    .select("id, household_id, role")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  return data;
}

export async function createHousehold(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = createHouseholdSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { error } = await supabase.rpc("create_household", {
    p_name: parsed.data.name,
  });
  if (error) {
    if (error.message.includes("já pertence")) {
      return fail("Você já faz parte de uma casa — saia dela antes.");
    }
    return fail("Não foi possível criar a casa. Tente novamente.");
  }

  revalidate();
  return ok(null);
}

/**
 * Convite v1 = LINK para compartilhar (WhatsApp/e-mail manual): o app não
 * tem provider de e-mail transacional configurado (decisão 88 — envio
 * automático é evolução). Reconvidar o mesmo e-mail invalida o token
 * anterior (delete + insert). O token cru volta só para o client montar a
 * URL — nunca é persistido.
 */
export async function inviteMember(
  input: unknown,
): Promise<ActionResult<{ token: string }>> {
  const parsed = inviteMemberSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const membership = await getMyMembership(supabase, user.id);
  if (!membership || membership.role !== "admin") {
    return fail("Só o administrador da casa pode convidar.");
  }

  const { data: allowed } = await supabase.rpc("check_rate_limit", {
    p_key: `${user.id}:invite`,
    p_max_hits: 20,
    p_window: "1 hour",
  });
  if (allowed === false) {
    return fail("Muitos convites em pouco tempo. Aguarde e tente de novo.");
  }

  // Reenvio invalida o anterior (o token antigo deixa de existir).
  await supabase
    .from("household_invites")
    .delete()
    .eq("household_id", membership.household_id)
    .eq("email", parsed.data.email)
    .is("accepted_at", null);

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const { error } = await supabase.from("household_invites").insert({
    household_id: membership.household_id,
    email: parsed.data.email,
    role: "member",
    token_hash: hashInviteToken(token),
    invited_by: user.id,
    expires_at: expiresAt.toISOString(),
  });
  if (error) {
    return fail("Não foi possível criar o convite. Tente novamente.");
  }

  revalidate();
  return ok({ token });
}

export async function revokeInvite(input: unknown): Promise<ActionResult<null>> {
  const parsed = inviteIdSchema.safeParse(input);
  if (!parsed.success) return fail("Convite inválido.");

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { error, count } = await supabase
    .from("household_invites")
    .delete({ count: "exact" })
    .eq("id", parsed.data);
  if (error || count === 0) return fail("Convite não encontrado.");

  revalidate();
  return ok(null);
}

export async function acceptInvite(input: unknown): Promise<ActionResult<null>> {
  const parsed = inviteTokenSchema.safeParse(input);
  if (!parsed.success) return fail("Convite inválido.");

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { error } = await supabase.rpc("accept_household_invite", {
    p_token_hash: hashInviteToken(parsed.data),
  });
  if (error) {
    if (error.message.includes("expirado")) return fail("Convite expirado.");
    if (error.message.includes("já utilizado")) {
      return fail("Este convite já foi utilizado.");
    }
    if (error.message.includes("já pertence")) {
      return fail("Você já faz parte de uma casa — saia dela antes de aceitar.");
    }
    return fail("Não foi possível aceitar o convite. Tente novamente.");
  }

  revalidate();
  return ok(null);
}

/** Admin remove um membro (nunca a si mesmo — para isso existe "sair"). */
export async function removeMember(input: unknown): Promise<ActionResult<null>> {
  const parsed = memberIdSchema.safeParse(input);
  if (!parsed.success) return fail("Membro inválido.");

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { error, count } = await supabase
    .from("household_members")
    .delete({ count: "exact" })
    .eq("id", parsed.data)
    .neq("user_id", user.id);
  if (error || count === 0) return fail("Membro não encontrado.");

  revalidate();
  return ok(null);
}

/**
 * Sair da casa. Guardas: o último admin não sai enquanto houver outros
 * membros (removeria a gestão da casa); se for o único membro, a casa
 * inteira é apagada (cascade limpa convites e compartilhamentos).
 */
export async function leaveHousehold(): Promise<ActionResult<null>> {
  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const membership = await getMyMembership(supabase, user.id);
  if (!membership) return fail("Você não faz parte de nenhuma casa.");

  const { data: members } = await supabase
    .from("household_members")
    .select("id, user_id, role")
    .eq("household_id", membership.household_id)
    .eq("status", "active");
  const others = (members ?? []).filter((m) => m.user_id !== user.id);

  if (others.length === 0) {
    // Único membro: apaga a casa inteira (policy: admin).
    const { error } = await supabase
      .from("households")
      .delete()
      .eq("id", membership.household_id);
    if (error) return fail("Não foi possível encerrar a casa. Tente de novo.");
  } else {
    if (
      membership.role === "admin" &&
      !others.some((m) => m.role === "admin")
    ) {
      return fail(
        "Você é o único administrador — remova os membros antes de sair.",
      );
    }
    const { error } = await supabase
      .from("household_members")
      .delete()
      .eq("id", membership.id);
    if (error) return fail("Não foi possível sair da casa. Tente de novo.");
  }

  revalidate();
  return ok(null);
}

export async function shareAccount(input: unknown): Promise<ActionResult<null>> {
  const parsed = shareAccountSchema.safeParse(input);
  if (!parsed.success) return fail("Conta inválida.");

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const membership = await getMyMembership(supabase, user.id);
  if (!membership || membership.role !== "admin") {
    return fail("Só o administrador da casa gerencia compartilhamentos.");
  }

  // A policy de INSERT revalida: admin + conta pertence a membro ativo.
  const { error } = await supabase.from("household_shared_accounts").insert({
    household_id: membership.household_id,
    account_id: parsed.data.accountId,
    shared_by: user.id,
  });
  if (error) {
    return fail("Não foi possível compartilhar a conta. Tente novamente.");
  }

  revalidate();
  return ok(null);
}

export async function unshareAccount(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = sharedAccountIdSchema.safeParse(input);
  if (!parsed.success) return fail("Compartilhamento inválido.");

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { error, count } = await supabase
    .from("household_shared_accounts")
    .delete({ count: "exact" })
    .eq("id", parsed.data);
  if (error || count === 0) return fail("Compartilhamento não encontrado.");

  revalidate();
  return ok(null);
}
