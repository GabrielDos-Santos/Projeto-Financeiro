"use client";

import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

import { usePushSubscription } from "@/hooks/use-push-subscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Fase 19 (push) — liga/desliga a assinatura DESTE dispositivo. Não aparece
 * em navegadores sem suporte (Safari fora de um PWA instalado — decisão
 * 104); permissão negada mostra a instrução de como reverter no navegador,
 * já que uma vez negada o app não pode pedir de novo via JS.
 */
export function PushNotificationsSection() {
  const { supported, permission, subscribed, isPending, subscribe, unsubscribe } =
    usePushSubscription();

  if (!supported) return null;

  async function handleToggle() {
    const result = subscribed ? await unsubscribe() : await subscribe();
    if (!result.ok) {
      toast.error(result.error ?? "Algo deu errado.");
      return;
    }
    toast.success(
      subscribed
        ? "Notificações desativadas neste dispositivo."
        : "Notificações ativadas neste dispositivo.",
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Notificações no celular</p>
          <p className="text-xs text-muted-foreground">
            {permission === "denied"
              ? "Bloqueadas nas configurações do navegador — precisa liberar por lá para ativar aqui."
              : "Aviso de vencimento de fatura e empréstimo, mesmo com o app fechado."}
          </p>
        </div>
        {permission !== "denied" && (
          <Button
            onClick={handleToggle}
            disabled={isPending}
            variant={subscribed ? "outline" : "default"}
            size="sm"
          >
            {subscribed ? <BellOff /> : <Bell />}
            {subscribed ? "Desativar" : "Ativar"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
