import type { Metadata } from "next";
import Link from "next/link";
import { FileQuestionMark } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Não encontrado" };

/**
 * 404 dentro do shell do app — casa com os notFound() das rotas dinâmicas
 * (ex.: /cartoes/[id] com id inexistente ou de outro usuário). Server component:
 * renderiza sob o (app)/layout, então mantém a sidebar e a navegação.
 */
export default function AppNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <EmptyState
        icon={FileQuestionMark}
        title="Página não encontrada"
        description="O item que você procura pode ter sido removido, ou o endereço está incorreto."
      >
        <Button asChild>
          <Link href="/dashboard">Voltar ao início</Link>
        </Button>
      </EmptyState>
    </div>
  );
}
