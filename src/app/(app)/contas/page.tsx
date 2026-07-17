import type { Metadata } from "next";
import { Plus, Wallet } from "lucide-react";

import { getAccountsWithBalances } from "@/features/accounts/queries";
import { AccountCard } from "@/features/accounts/components/account-card";
import { AccountFormDialog } from "@/features/accounts/components/account-form-dialog";
import { AccountsSummary } from "@/features/accounts/components/accounts-summary";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Contas" };

export default async function ContasPage() {
  const accounts = await getAccountsWithBalances();
  const active = accounts.filter((account) => !account.is_archived);
  const archived = accounts.filter((account) => account.is_archived);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Contas"
        description="Suas contas e carteiras — o saldo é derivado dos lançamentos pagos."
      >
        <AccountFormDialog>
          <Button>
            <Plus /> Nova conta
          </Button>
        </AccountFormDialog>
      </PageHeader>

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nenhuma conta ainda"
          description="Crie sua primeira conta (banco, carteira, dinheiro…) para começar a lançar receitas e despesas."
        >
          <AccountFormDialog>
            <Button>
              <Plus /> Criar primeira conta
            </Button>
          </AccountFormDialog>
        </EmptyState>
      ) : (
        <>
          <AccountsSummary accounts={accounts} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {active.map((account) => (
              <AccountCard key={account.account_id} account={account} />
            ))}
          </div>
          {archived.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Arquivadas
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {archived.map((account) => (
                  <AccountCard key={account.account_id} account={account} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
