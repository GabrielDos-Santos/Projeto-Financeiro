import { Landmark, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { getSummary } from "../queries";
import { StatCard } from "@/components/shared/stat-card";
import { MoneyDisplay } from "@/components/shared/money-display";

export async function SummaryCards() {
  const summary = await getSummary();

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Saldo em contas" icon={Wallet}>
        <MoneyDisplay cents={summary.balanceCents} colorBySign />
      </StatCard>
      <StatCard
        label="Receitas do mês"
        icon={TrendingUp}
        hint="Recebidas (pagas)"
      >
        <MoneyDisplay
          cents={summary.incomePaidCents}
          className="text-emerald-600 dark:text-emerald-400"
        />
      </StatCard>
      <StatCard label="Despesas do mês" icon={TrendingDown} hint="Pagas">
        <MoneyDisplay
          cents={summary.expensePaidCents}
          className="text-red-600 dark:text-red-400"
        />
      </StatCard>
      <StatCard
        label="Saldo previsto"
        icon={Landmark}
        hint="Fim do mês, contando pendentes e faturas"
      >
        <MoneyDisplay cents={summary.forecastCents} colorBySign />
      </StatCard>
    </div>
  );
}
