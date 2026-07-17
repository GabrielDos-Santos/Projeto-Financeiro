import type { Metadata } from "next";
import { CreditCard, Plus } from "lucide-react";

import { getCardsWithLimits } from "@/features/cards/queries";
import { CardFormDialog } from "@/features/cards/components/card-form-dialog";
import { CreditCardWidget } from "@/features/cards/components/credit-card-widget";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Cartões" };

export default async function CartoesPage() {
  const cards = await getCardsWithLimits();
  const active = cards.filter((card) => !card.is_archived);
  const archived = cards.filter((card) => card.is_archived);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cartões"
        description="Limite disponível e fatura aberta por cartão. Compras entram por competência."
      >
        <CardFormDialog>
          <Button>
            <Plus /> Novo cartão
          </Button>
        </CardFormDialog>
      </PageHeader>

      {cards.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Nenhum cartão ainda"
          description="Cadastre um cartão (limite, fechamento e vencimento) para lançar compras e acompanhar as faturas."
        >
          <CardFormDialog>
            <Button>
              <Plus /> Criar primeiro cartão
            </Button>
          </CardFormDialog>
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {active.map((card) => (
              <CreditCardWidget key={card.id} card={card} />
            ))}
          </div>
          {archived.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Arquivados
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {archived.map((card) => (
                  <CreditCardWidget key={card.id} card={card} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
