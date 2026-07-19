import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "Sem conexão" };

/**
 * Fallback do Service Worker (Fase 15, PWA) quando o usuário abre uma rota
 * sem rede — o app não faz offline-first de dados (fora de escopo, decisão
 * 26 da expansão), só evita a tela em branco do navegador. Precisa ser
 * estática (sem cookies/dados dinâmicos) para o SW conseguir precachear o
 * HTML no install (ver `additionalPrecacheEntries` em `next.config.ts`).
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <WifiOff className="size-10 text-muted-foreground" aria-hidden />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Sem conexão</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          Não foi possível carregar esta página. Verifique sua internet e
          tente de novo.
        </p>
      </div>
      <a
        href="/dashboard"
        className="text-sm font-medium text-primary underline underline-offset-4"
      >
        Tentar novamente
      </a>
    </main>
  );
}
