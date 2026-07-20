/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * Fase 15 (PWA, ARQUITETURA-EXPANSAO.md) — só shell + fallback offline, de
 * propósito: offline-first de dados financeiros (mutações via Server Action)
 * é um projeto grande e arriscado (escopo explicitamente fora da v1). O SW
 * cobre só o precache dos assets estáticos e uma página de aviso quando o
 * usuário abre uma rota sem rede.
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

/**
 * Notificações push (Fase 19, docs/ARQUITETURA-EXPANSAO-PUSH.md) — eventos
 * próprios do navegador, fora do que o Serwist gerencia (install/activate/
 * fetch); coexistem sem conflito com `serwist.addEventListeners()` acima.
 */
type PushPayload = { title: string; body: string; url: string; tag?: string };

self.addEventListener("push", (event: PushEvent) => {
  let payload: PushPayload;
  try {
    payload = event.data!.json() as PushPayload;
  } catch {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url },
    }),
  );
});

// Clica na notificação → foca uma aba já aberta na rota (ou abre uma nova).
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url: string = event.notification.data?.url ?? "/dashboard";

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = clientsList.find(
        (client) => new URL(client.url).pathname === url,
      );
      if (existing) {
        await existing.focus();
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
