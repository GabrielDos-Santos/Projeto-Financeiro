import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      "VAPID não configurado — defina NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e VAPID_SUBJECT.",
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  /** Rota aberta ao clicar na notificação (ex.: "/cartoes/<id>"). */
  url: string;
  /** Mesma tag = a notificação nova substitui a anterior no SO. */
  tag?: string;
};

/**
 * Envia `payload` para todas as assinaturas ATIVAS do usuário neste servidor
 * — server-only (usa a chave privada VAPID), pensado para o job de cron
 * (decisão 103) mas reaproveitável por qualquer envio futuro de push.
 * Melhor esforço por assinatura: falha numa não impede as demais.
 * Assinatura morta (404/410 — dispositivo desinstalou/revogou a permissão)
 * é apagada para não tentar de novo pra sempre.
 */
export async function sendPushToUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  ensureVapidConfigured();

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, removed: 0 };
  }

  const body = JSON.stringify(payload);
  let sent = 0;
  let removed = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
        );
        sent += 1;
      } catch (error) {
        const statusCode =
          error instanceof webpush.WebPushError ? error.statusCode : null;
        if (statusCode === 404 || statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", subscription.id);
          removed += 1;
        }
        // Outras falhas (rede, 5xx do serviço de push): melhor esforço —
        // o job de amanhã tenta de novo, sem derrubar as outras assinaturas.
      }
    }),
  );

  return { sent, removed };
}
