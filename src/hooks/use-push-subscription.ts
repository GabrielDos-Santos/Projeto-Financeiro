"use client";

import * as React from "react";

import {
  subscribeToPush,
  unsubscribeFromPush,
} from "@/features/push/actions";

/**
 * VAPID pública vem em base64url; `pushManager.subscribe` exige um
 * `BufferSource` — o retorno genérico de `Uint8Array.from` (`ArrayBufferLike`)
 * não satisfaz o tipo mais estrito `ArrayBuffer` do lib.dom mais recente,
 * daí o `.buffer` explícito abaixo.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

type PermissionState = "default" | "granted" | "denied" | "unsupported";

/**
 * Fase 19 (push) — espelha o formato de `useInstallPrompt`: estados simples
 * pra UI decidir o que mostrar. `supported` cobre navegadores sem Push API
 * (ex.: Safari fora de um PWA instalado — decisão 104).
 */
export function usePushSubscription() {
  const [permission, setPermission] = React.useState<PermissionState>(
    "unsupported",
  );
  const [subscribed, setSubscribed] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  const refresh = React.useCallback(async () => {
    if (!supported) return;
    setPermission(Notification.permission as PermissionState);
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    setSubscribed(existing != null);
  }, [supported]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = React.useCallback(async () => {
    if (!supported) return { ok: false, error: "Navegador sem suporte." };
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return { ok: false, error: "Notificações push não configuradas." };
    }

    setIsPending(true);
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult as PermissionState);
      if (permissionResult !== "granted") {
        return { ok: false, error: "Permissão negada." };
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const result = await subscribeToPush(subscription.toJSON());
      if (!result.ok) return result;

      setSubscribed(true);
      return { ok: true as const };
    } catch {
      return { ok: false, error: "Não foi possível ativar as notificações." };
    } finally {
      setIsPending(false);
    }
  }, [supported]);

  const unsubscribe = React.useCallback(async () => {
    setIsPending(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeFromPush({ endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      return { ok: true as const };
    } catch {
      return { ok: false, error: "Não foi possível desativar as notificações." };
    } finally {
      setIsPending(false);
    }
  }, []);

  return { supported, permission, subscribed, isPending, subscribe, unsubscribe };
}
