import type { Metadata } from "next";
import Link from "next/link";
import { Upload } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getHouseholdContext } from "@/features/households/queries";
import {
  DEFAULT_ENTRIES_PAGE_SIZE,
  fetchEntriesPage,
} from "@/features/transactions/queries";
import { TransactionsView } from "@/features/transactions/components/transactions-view";
import type {
  AccountOption,
  CardOption,
  CategoryOption,
} from "@/features/transactions/types";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Transações" };

export default async function TransacoesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const myUserId = user?.id ?? "";

  // Estas listas têm DOIS papéis nesta tela (decisão 96):
  //  • exibição — resolver nome/ícone da conta/cartão/categoria de cada linha,
  //    inclusive as de outro membro que a RLS da Fase 16 mostra ao admin;
  //  • seletores (formulário e filtros) — que devem oferecer só o que é DO
  //    usuário, senão ele lançaria na conta/categoria de outra pessoa (e as
  //    categorias apareceriam duplicadas, já que cada membro tem as suas 14).
  // Por isso busca tudo o que é visível e deriva os subconjuntos "own*".
  const [accountsResult, categoriesResult, cardsResult, firstPage, household] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("id, name, user_id")
        .eq("is_archived", false)
        .order("name"),
      supabase
        .from("categories")
        .select("id, name, type, color, icon, user_id")
        .eq("is_archived", false)
        .order("name"),
      supabase
        .from("credit_cards")
        .select("id, name, closing_day, due_day, user_id")
        .eq("is_archived", false)
        .order("name"),
      fetchEntriesPage(supabase, {}, 1, DEFAULT_ENTRIES_PAGE_SIZE),
      getHouseholdContext(),
    ]);

  const accounts: AccountOption[] = (accountsResult.data ?? []).map(
    ({ id, name }) => ({ id, name }),
  );
  const categories: CategoryOption[] = (categoriesResult.data ?? []).map(
    ({ id, name, type, color, icon }) => ({ id, name, type, color, icon }),
  );
  const cards: CardOption[] = (cardsResult.data ?? []).map((card) => ({
    id: card.id,
    name: card.name,
    closingDay: card.closing_day,
    dueDay: card.due_day,
  }));

  const ownAccounts: AccountOption[] = (accountsResult.data ?? [])
    .filter((row) => row.user_id === myUserId)
    .map(({ id, name }) => ({ id, name }));
  const ownCategories: CategoryOption[] = (categoriesResult.data ?? [])
    .filter((row) => row.user_id === myUserId)
    .map(({ id, name, type, color, icon }) => ({ id, name, type, color, icon }));
  const ownCards: CardOption[] = (cardsResult.data ?? [])
    .filter((row) => row.user_id === myUserId)
    .map((card) => ({
      id: card.id,
      name: card.name,
      closingDay: card.closing_day,
      dueDay: card.due_day,
    }));

  // Filtro por membro só faz sentido/funciona para o admin (membro comum só
  // vê os próprios + contas compartilhadas via RLS — filtrar por outro daria
  // lista vazia). Passa vazio para os demais → a UI nem renderiza o filtro.
  const memberOptions =
    household?.isAdmin && household.members.length > 1 ? household.members : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Transações"
        description="Receitas, despesas, cartão e transferências — pagos movem o saldo; pendentes ficam previstos."
      >
        <Button variant="outline" asChild>
          <Link href="/transacoes/importar">
            <Upload /> Importar
          </Link>
        </Button>
      </PageHeader>
      <TransactionsView
        accounts={accounts}
        categories={categories}
        cards={cards}
        ownAccounts={ownAccounts}
        ownCategories={ownCategories}
        ownCards={ownCards}
        initialFirstPage={firstPage}
        myUserId={myUserId}
        memberNames={household?.memberNames ?? null}
        memberOptions={memberOptions}
      />
    </div>
  );
}
