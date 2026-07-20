"use server";

import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { pushSubscribeSchema, pushUnsubscribeSchema } from "./schemas";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Salva (ou atualiza) a assinatura de push deste dispositivo/navegador —
 * `endpoint` é único por dispositivo (decisão 102): reassinar (ex.: depois
 * de limpar dados do site) só troca o endpoint, não duplica linha.
 */
export async function subscribeToPush(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = pushSubscribeSchema.safeParse(input);
  if (!parsed.success) return fail("Assinatura inválida.");

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) return fail("Não foi possível ativar as notificações.");

  return ok(null);
}

export async function unsubscribeFromPush(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = pushUnsubscribeSchema.safeParse(input);
  if (!parsed.success) return fail("Assinatura inválida.");

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", parsed.data.endpoint);
  if (error) return fail("Não foi possível desativar as notificações.");

  return ok(null);
}
