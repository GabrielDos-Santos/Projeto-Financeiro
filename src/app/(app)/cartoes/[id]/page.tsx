import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getCard, getCardInvoices } from "@/features/cards/queries";
import { InvoiceTimeline } from "@/features/cards/components/invoice-timeline";
import { bestPurchaseDay } from "@/features/cards/types";
import type {
  AccountOption,
  CategoryOption,
} from "@/features/transactions/types";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = { title: "Cartão" };

export default async function CartaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [card, invoices, accountsResult, categoriesResult] = await Promise.all([
    getCard(id),
    getCardInvoices(id),
    supabase
      .from("accounts")
      .select("id, name")
      .eq("is_archived", false)
      .order("name"),
    supabase
      .from("categories")
      .select("id, name, type, color, icon")
      .eq("is_archived", false)
      .order("name"),
  ]);

  if (!card) notFound();

  const accounts: AccountOption[] = accountsResult.data ?? [];
  const categories: CategoryOption[] = categoriesResult.data ?? [];

  const committed = invoices
    .filter((i) => i.status === "open" || i.status === "closed")
    .reduce((sum, i) => sum + (i.total_cents ?? 0), 0);
  const availableCents = card.limit_cents - committed;

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
          <Link href="/cartoes">
            <ArrowLeft /> Cartões
          </Link>
        </Button>
        <PageHeader
          title={card.name}
          description={
            card.bank
              ? `${card.bank} · fecha dia ${card.closing_day}, vence dia ${card.due_day}`
              : `Fecha dia ${card.closing_day}, vence dia ${card.due_day}`
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-1">
            <p className="text-sm text-muted-foreground">Limite</p>
            <p className="text-xl font-semibold tabular-nums">
              {formatCents(card.limit_cents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1">
            <p className="text-sm text-muted-foreground">Disponível</p>
            <MoneyDisplay
              cents={availableCents}
              colorBySign
              className="text-xl font-semibold"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Melhor dia de compra
            </p>
            <p className="text-xl font-semibold tabular-nums">
              {bestPurchaseDay(card.closing_day)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Faturas</h2>
        <InvoiceTimeline
          invoices={invoices}
          accounts={accounts}
          categories={categories}
          labelByDueMonth={card.invoice_name_by_due_month}
        />
      </div>
    </div>
  );
}
