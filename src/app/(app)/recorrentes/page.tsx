import type { Metadata } from "next";
import { Plus, Repeat } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getRecurring } from "@/features/recurring/queries";
import { GenerateNowButton } from "@/features/recurring/components/generate-now-button";
import { RecurringFormDialog } from "@/features/recurring/components/recurring-form-dialog";
import { RecurringList } from "@/features/recurring/components/recurring-list";
import type {
  AccountOption,
  CardOption,
  CategoryOption,
} from "@/features/transactions/types";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Recorrentes" };

export default async function RecorrentesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const myUserId = user?.id ?? "";

  // Tudo aqui alimenta SELETORES de formulário: escopo pessoal explícito, já
  // que a RLS da Fase 16 mostraria contas/categorias/cartões dos membros ao
  // admin — e uma recorrência é sempre do próprio usuário (decisão 96).
  const [recurring, accountsResult, categoriesResult, cardsResult] =
    await Promise.all([
      getRecurring(),
      supabase
        .from("accounts")
        .select("id, name")
        .eq("user_id", myUserId)
        .eq("is_archived", false)
        .order("name"),
      supabase
        .from("categories")
        .select("id, name, type, color, icon")
        .eq("user_id", myUserId)
        .eq("is_archived", false)
        .order("name"),
      supabase
        .from("credit_cards")
        .select("id, name, closing_day, due_day")
        .eq("user_id", myUserId)
        .eq("is_archived", false)
        .order("name"),
    ]);

  const accounts: AccountOption[] = accountsResult.data ?? [];
  const categories: CategoryOption[] = categoriesResult.data ?? [];
  const cards: CardOption[] = (cardsResult.data ?? []).map((card) => ({
    id: card.id,
    name: card.name,
    closingDay: card.closing_day,
    dueDay: card.due_day,
  }));

  const canCreate = accounts.length > 0 && categories.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Recorrentes"
        description="Contas fixas e receitas que se repetem — geram lançamentos pendentes sozinhas."
      >
        {recurring.length > 0 && <GenerateNowButton />}
        {canCreate && (
          <RecurringFormDialog
            accounts={accounts}
            categories={categories}
            cards={cards}
          >
            <Button>
              <Plus /> Nova recorrência
            </Button>
          </RecurringFormDialog>
        )}
      </PageHeader>

      {!canCreate ? (
        <EmptyState
          icon={Repeat}
          title="Crie uma conta e uma categoria primeiro"
          description="Recorrências precisam de ao menos uma conta e uma categoria. Você já tem categorias padrão — só falta uma conta em Contas."
        />
      ) : recurring.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="Nenhuma recorrência ainda"
          description="Cadastre uma conta fixa (aluguel, faculdade, assinatura) ou uma receita (salário) uma única vez — o app cria os lançamentos todo período."
        >
          <RecurringFormDialog
            accounts={accounts}
            categories={categories}
            cards={cards}
          >
            <Button>
              <Plus /> Criar primeira recorrência
            </Button>
          </RecurringFormDialog>
        </EmptyState>
      ) : (
        <RecurringList
          recurring={recurring}
          accounts={accounts}
          categories={categories}
          cards={cards}
        />
      )}
    </div>
  );
}
