"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function markNotificationRead(
  id: unknown,
): Promise<ActionResult<null>> {
  const parsedId = z.uuid().safeParse(id);
  if (!parsedId.success) return fail("Notificação inválida.");

  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", parsedId.data)
    .is("read_at", null);

  if (error) return fail("Não foi possível marcar como lida.");

  revalidatePath("/", "layout");
  return ok(null);
}

export async function markAllNotificationsRead(): Promise<ActionResult<null>> {
  const { supabase, user } = await requireUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) return fail("Não foi possível marcar as notificações como lidas.");

  revalidatePath("/", "layout");
  return ok(null);
}
