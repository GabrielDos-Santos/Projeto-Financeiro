import type { Metadata } from "next";
import { HandCoins, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getLoans } from "@/features/loans/queries";
import { LoanFormDialog } from "@/features/loans/components/loan-form-dialog";
import { LoansList } from "@/features/loans/components/loans-list";
import type { AccountOption, CategoryOption } from "@/features/transactions/types";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Empréstimos" };

export default async function EmprestimosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const myUserId = user?.id ?? "";

  // Seletores do formulário: sempre DO usuário (decisão 96) — a RLS estendida
  // da Fase 16 deixaria o admin ver contas/categorias dos membros aqui.
  const [loans, accountsResult, categoriesResult] = await Promise.all([
    getLoans(),
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
  ]);

  const accounts: AccountOption[] = accountsResult.data ?? [];
  const categories: CategoryOption[] = categoriesResult.data ?? [];
  const canCreate = accounts.length > 0 && categories.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Empréstimos"
        description="Dívidas parceladas — o valor recebido (se houver) credita a conta; as parcelas geram despesa no vencimento."
      >
        {canCreate && (
          <LoanFormDialog accounts={accounts} categories={categories}>
            <Button>
              <Plus /> Novo empréstimo
            </Button>
          </LoanFormDialog>
        )}
      </PageHeader>

      {!canCreate ? (
        <EmptyState
          icon={HandCoins}
          title="Crie uma conta e uma categoria primeiro"
          description="Um empréstimo precisa de uma conta para as parcelas e de uma categoria de despesa."
        />
      ) : loans.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="Nenhum empréstimo ainda"
          description="Cadastre um empréstimo — as parcelas entram automaticamente como despesa, no vencimento certo."
        >
          <LoanFormDialog accounts={accounts} categories={categories}>
            <Button>
              <Plus /> Cadastrar primeiro empréstimo
            </Button>
          </LoanFormDialog>
        </EmptyState>
      ) : (
        <LoansList loans={loans} />
      )}
    </div>
  );
}
