import Link from "next/link";
import { ArrowLeftRight, ChevronRight } from "lucide-react";

import { getRecentEntries, type RecentEntry } from "../queries";
import { formatDateBR } from "@/lib/dates";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DomainIcon } from "@/components/shared/domain-icon";
import { MoneyDisplay } from "@/components/shared/money-display";

function signedCents(entry: RecentEntry): number {
  if (entry.type === "transfer") {
    return entry.direction === "out" ? -entry.amountCents : entry.amountCents;
  }
  return entry.type === "expense" ? -entry.amountCents : entry.amountCents;
}

export async function RecentTransactions() {
  const entries = await getRecentEntries(8);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Últimas movimentações</CardTitle>
        <CardDescription>As mais recentes.</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma movimentação ainda.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {entries.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 py-2">
                  <div
                    className="flex size-8 shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: `${entry.categoryColor ?? "#71717a"}1f`,
                      color: entry.categoryColor ?? "#71717a",
                    }}
                  >
                    {entry.type === "transfer" ? (
                      <ArrowLeftRight className="size-4" aria-hidden />
                    ) : (
                      <DomainIcon
                        name={entry.categoryIcon}
                        className="size-4"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {entry.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.date ? formatDateBR(entry.date) : "—"}
                      {entry.categoryName ? ` · ${entry.categoryName}` : ""}
                    </p>
                  </div>
                  <MoneyDisplay
                    cents={signedCents(entry)}
                    colorBySign
                    className="text-sm font-medium"
                  />
                </li>
              ))}
            </ul>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="mt-2 w-full text-muted-foreground"
            >
              <Link href="/transacoes">
                Ver todas <ChevronRight />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
