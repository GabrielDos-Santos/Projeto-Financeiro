import { ArrowLeftRight } from "lucide-react";

import { formatDateBR } from "@/lib/dates";
import type { HouseholdRecentEntry } from "../queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DomainIcon } from "@/components/shared/domain-icon";
import { MemberBadge } from "@/components/shared/member-badge";
import { MoneyDisplay } from "@/components/shared/money-display";

function signedCents(entry: HouseholdRecentEntry): number {
  if (entry.type === "transfer") {
    return entry.direction === "out" ? -entry.amountCents : entry.amountCents;
  }
  return entry.type === "expense" ? -entry.amountCents : entry.amountCents;
}

/** Feed de últimas movimentações da casa, com o membro dono de cada linha. */
export function HouseholdRecentEntries({
  entries,
}: {
  entries: HouseholdRecentEntry[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Últimas movimentações</CardTitle>
        <CardDescription>As mais recentes da casa.</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma movimentação ainda.
          </p>
        ) : (
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
                    <DomainIcon name={entry.categoryIcon} className="size-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <p className="truncate text-sm font-medium">
                      {entry.description}
                    </p>
                    <MemberBadge name={entry.memberName} />
                  </div>
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
        )}
      </CardContent>
    </Card>
  );
}
