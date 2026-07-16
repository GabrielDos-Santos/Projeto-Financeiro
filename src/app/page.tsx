import { Wallet } from "lucide-react";

// Placeholder da Fase 0 — validado no deploy inicial.
// Na Fase 1, "/" passa a redirecionar conforme a sessão (middleware).
export default function Home() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6">
      <div className="flex size-12 items-center justify-center rounded-xl border bg-card text-card-foreground">
        <Wallet className="size-6" aria-hidden />
      </div>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">FinApp</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Fundação instalada — Next.js 15, Tailwind v4 e shadcn/ui prontos.
          Autenticação e shell do app chegam na Fase 1.
        </p>
      </div>
      <p className="font-mono text-xs text-muted-foreground/70">
        fase 0 · fundação
      </p>
    </main>
  );
}
