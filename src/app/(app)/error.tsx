"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

/**
 * Fallback de erro para TODAS as rotas do grupo (app): se uma query de Server
 * Component lançar, o usuário vê uma tela amigável com "tentar de novo" — dentro
 * do shell do app — em vez do overlay cru do Next. Client component com reset()
 * (contrato do Next). Nada de detalhe do erro na UI; o log fica no console.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <EmptyState
        icon={TriangleAlert}
        title="Algo deu errado"
        description="Não foi possível carregar esta página. Tente de novo — se continuar, recarregue o app."
      >
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={reset}>Tentar de novo</Button>
          <Button asChild variant="ghost">
            <Link href="/dashboard">Ir para o início</Link>
          </Button>
        </div>
      </EmptyState>
    </div>
  );
}
