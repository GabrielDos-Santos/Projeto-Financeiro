import { z } from "zod";

/** Formato exato do objeto devolvido por `PushSubscription.toJSON()`. */
export const pushSubscribeSchema = z.object({
  endpoint: z.url("Assinatura inválida"),
  keys: z.object({
    p256dh: z.string().min(1, "Assinatura inválida"),
    auth: z.string().min(1, "Assinatura inválida"),
  }),
});

export type PushSubscribeInput = z.infer<typeof pushSubscribeSchema>;

export const pushUnsubscribeSchema = z.object({
  endpoint: z.url("Assinatura inválida"),
});
