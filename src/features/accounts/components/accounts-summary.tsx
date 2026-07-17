import { Card, CardContent } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/shared/money-display";
import type { AccountWithBalance } from "../types";

/** Resumo do topo de /contas — considera apenas contas ativas (não arquivadas). */
export function AccountsSummary({
  accounts,
}: {
  accounts: AccountWithBalance[];
}) {
  const active = accounts.filter((account) => !account.is_archived);
  const totalCents = active.reduce(
    (sum, account) => sum + (account.balance_cents ?? 0),
    0,
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardContent className="space-y-1">
          <p className="text-sm text-muted-foreground">Saldo total</p>
          <MoneyDisplay
            cents={totalCents}
            colorBySign
            className="text-2xl font-semibold"
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-1">
          <p className="text-sm text-muted-foreground">Contas ativas</p>
          <p className="text-2xl font-semibold tabular-nums">{active.length}</p>
        </CardContent>
      </Card>
    </div>
  );
}
