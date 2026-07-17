import Link from "next/link";
import { ChevronRight, CreditCard } from "lucide-react";

import { getCardsWithLimits } from "@/features/cards/queries";
import { formatCents } from "@/lib/money";
import { LimitBar } from "@/features/cards/components/limit-bar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DomainIcon } from "@/components/shared/domain-icon";

export async function CardsOverview() {
  const cards = (await getCardsWithLimits()).filter((c) => !c.is_archived);

  if (cards.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cartões</CardTitle>
        <CardDescription>Limite e fatura aberta.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {cards.slice(0, 4).map((card) => {
          const color = card.color ?? "#8b5cf6";
          return (
            <div key={card.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className="flex size-7 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${color}1f`, color }}
                >
                  <DomainIcon name={card.icon} className="size-4" />
                </div>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {card.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  Fatura {formatCents(card.openInvoiceCents)}
                </span>
              </div>
              <LimitBar
                limitCents={card.limit_cents}
                availableCents={card.availableCents}
                color={color}
              />
            </div>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="w-full text-muted-foreground"
        >
          <Link href="/cartoes">
            <CreditCard /> Ver cartões <ChevronRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
