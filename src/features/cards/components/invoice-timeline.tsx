"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { formatDateBR, formatMonthBR } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type {
  AccountOption,
  CategoryOption,
} from "@/features/transactions/types";
import { reopenInvoice } from "../actions";
import { INVOICE_STATUS_LABELS, type InvoiceTotals } from "../types";
import { PayInvoiceDialog } from "./pay-invoice-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Receipt } from "lucide-react";

function StatusBadge({ status }: { status: InvoiceTotals["status"] }) {
  if (!status) return null;
  const label = INVOICE_STATUS_LABELS[status];
  const className =
    status === "paid"
      ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
      : status === "closed"
        ? "border-amber-500/40 text-amber-600 dark:text-amber-400"
        : "text-muted-foreground";
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

function InvoiceItems({ invoiceId }: { invoiceId: string }) {
  const supabase = React.useMemo(() => createClient(), []);
  const itemsQuery = useQuery({
    queryKey: ["invoice-items", invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_entries")
        .select("id, description, date, amount_cents, installment_number")
        .eq("invoice_id", invoiceId)
        .order("date", { ascending: true });
      if (error) throw new Error("Falha ao carregar os itens.");
      return data;
    },
  });

  if (itemsQuery.isPending) {
    return <Skeleton className="h-16 w-full" />;
  }
  const items = itemsQuery.data ?? [];
  if (items.length === 0) {
    return (
      <p className="py-2 text-sm text-muted-foreground">
        Sem itens nesta fatura.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-2 py-2 text-sm">
          <span className="w-20 shrink-0 text-xs text-muted-foreground">
            {item.date ? formatDateBR(item.date) : "—"}
          </span>
          <span className="min-w-0 flex-1 truncate">
            {item.description}
            {item.installment_number != null && (
              <span className="text-muted-foreground">
                {" "}
                · parcela {item.installment_number}
              </span>
            )}
          </span>
          <span className="tabular-nums">
            {formatCents(item.amount_cents ?? 0)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function InvoiceCard({
  invoice,
  accounts,
  categories,
}: {
  invoice: InvoiceTotals;
  accounts: AccountOption[];
  categories: CategoryOption[];
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [payOpen, setPayOpen] = React.useState(false);
  const [reopenOpen, setReopenOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const isPaid = invoice.status === "paid";
  const hasTotal = (invoice.total_cents ?? 0) > 0;

  function handleReopen() {
    startTransition(async () => {
      const result = await reopenInvoice(invoice.invoice_id);
      if (!result.ok) {
        toast.error(result.error);
        setReopenOpen(false);
        return;
      }
      toast.success("Fatura reaberta.");
      setReopenOpen(false);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <p className="font-medium capitalize">
                {invoice.reference_month
                  ? formatMonthBR(invoice.reference_month)
                  : "—"}
              </p>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              {invoice.closing_date
                ? `Fecha ${formatDateBR(invoice.closing_date)}`
                : ""}
              {invoice.due_date
                ? ` · vence ${formatDateBR(invoice.due_date)}`
                : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold tabular-nums">
              {formatCents(invoice.total_cents ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              {invoice.items_count ?? 0} item(s)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setExpanded((v) => !v)}
          >
            <ChevronDown
              className={cn("transition-transform", expanded && "rotate-180")}
            />
            {expanded ? "Ocultar itens" : "Ver itens"}
          </Button>
          <div className="flex-1" />
          {isPaid ? (
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => setReopenOpen(true)}
            >
              {isPending ? <Loader2 className="animate-spin" /> : <RotateCcw />}
              Reabrir
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={!hasTotal}
              onClick={() => setPayOpen(true)}
            >
              Pagar fatura
            </Button>
          )}
        </div>

        {expanded && invoice.invoice_id && (
          <div className="border-t pt-1">
            <InvoiceItems invoiceId={invoice.invoice_id} />
          </div>
        )}
      </CardContent>

      <PayInvoiceDialog
        invoice={invoice}
        accounts={accounts}
        categories={categories}
        open={payOpen}
        onOpenChange={setPayOpen}
      />
      <ConfirmDialog
        open={reopenOpen}
        onOpenChange={setReopenOpen}
        title="Reabrir fatura"
        description="A despesa de pagamento será apagada e os itens da fatura voltam a pendente. Use para corrigir um pagamento equivocado."
        confirmLabel="Reabrir"
        isPending={isPending}
        onConfirm={handleReopen}
      />
    </Card>
  );
}

export function InvoiceTimeline({
  invoices,
  accounts,
  categories,
}: {
  invoices: InvoiceTotals[];
  accounts: AccountOption[];
  categories: CategoryOption[];
}) {
  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Nenhuma fatura ainda"
        description="As faturas aparecem quando você lança a primeira compra neste cartão."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {invoices.map((invoice) => (
        <InvoiceCard
          key={invoice.invoice_id}
          invoice={invoice}
          accounts={accounts}
          categories={categories}
        />
      ))}
    </div>
  );
}
