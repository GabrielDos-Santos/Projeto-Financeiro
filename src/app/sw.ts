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
