"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { formatDateBR, formatMonthBR } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type {
  AccountOption,
  CategoryOption,
} from "@/features/transactions/types";
import { removeInvoicePayment, reopenInvoice } from "../actions";
import {
  INVOICE_STATUS_LABELS,
  invoiceRemainingCents,
  isPartiallyPaid,
  type InvoicePayment,
  type InvoiceTotals,
  type InvoiceWithPayments,
} from "../types";
import { PayInvoiceDialog } from "./pay-invoice-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { HistoricalBadge } from "@/components/shared/historical-badge";
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

/** Lista dos pagamentos (parciais + o que quitou) feitos na fatura. */
function InvoicePayments({
  payments,
  onRemove,
  removingId,
}: {
  payments: InvoicePayment[];
  onRemove: (payment: InvoicePayment) => void;
  removingId: string | null;
}) {
  if (payments.length === 0) return null;
  return (
    <div className="border-t pt-2">
      <p className="mb-1 text-xs font-medium text-muted-foreground">
        Pagamentos
      </p>
      <ul className="divide-y divide-border">
        {payments.map((payment) => (
          <li
            key={payment.id}
            className="flex items-center gap-2 py-1.5 text-sm"
          >
            <span className="w-20 shrink-0 text-xs text-muted-foreground">
              {payment.date ? formatDateBR(payment.date) : "—"}
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              {formatCents(payment.amountCents)}
              {payment.isHistorical && <HistoricalBadge />}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              disabled={removingId === payment.id}
              onClick={() => onRemove(payment)}
              aria-label="Remover pagamento"
            >
              {removingId === payment.id ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Trash2 />
              )}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InvoiceCard({
  invoice,
  accounts,
  categories,
  labelByDueMonth,
}: {
  invoice: InvoiceWithPayments;
  accounts: AccountOption[];
  categories: CategoryOption[];
  labelByDueMonth: boolean;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [payOpen, setPayOpen] = React.useState(false);
  const [reopenOpen, setReopenOpen] = React.useState(false);
  const [paymentToRemove, setPaymentToRemove] =
    React.useState<InvoicePayment | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const isPaid = invoice.status === "paid";
  const partial = isPartiallyPaid(invoice);
  const remaining = invoiceRemainingCents(invoice);
  const paidCents = invoice.paid_cents ?? 0;

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

  function handleRemovePayment() {
    const payment = paymentToRemove;
    if (!payment) return;
    setRemovingId(payment.id);
    startTransition(async () => {
      const result = await removeInvoicePayment(payment.id);
      setRemovingId(null);
      setPaymentToRemove(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Pagamento removido.");
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium capitalize">
                {/* Rótulo por cartão (migration 0013) — bancos variam: a
                 * maioria nomeia pela competência, o Sicredi pelo mês de
                 * vencimento. Não afeta nenhum cálculo, só o texto aqui. */}
                {(() => {
                  const monthSource =
                    labelByDueMonth && invoice.due_date
                      ? invoice.due_date
                      : invoice.reference_month;
                  return monthSource ? formatMonthBR(monthSource) : "—";
                })()}
              </p>
              <StatusBadge status={invoice.status} />
              {partial && (
                <Badge
                  variant="outline"
                  className="border-sky-500/40 text-sky-600 dark:text-sky-400"
                >
                  Parcialmente paga
                </Badge>
              )}
              {isPaid && invoice.paymentIsHistorical && <HistoricalBadge />}
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
            {partial ? (
              <p className="text-xs text-muted-foreground tabular-nums">
                Pago {formatCents(paidCents)} · falta{" "}
                <span className="font-medium text-foreground">
                  {formatCents(remaining)}
                </span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {invoice.items_count ?? 0} item(s)
              </p>
            )}
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
              disabled={remaining <= 0}
              onClick={() => setPayOpen(true)}
            >
              {partial ? "Pagar restante" : "Pagar fatura"}
            </Button>
          )}
        </div>

        {expanded && invoice.invoice_id && (
          <div className="space-y-2 border-t pt-1">
            <InvoiceItems invoiceId={invoice.invoice_id} />
            <InvoicePayments
              payments={invoice.payments}
              onRemove={setPaymentToRemove}
              removingId={removingId}
            />
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
        description="Todos os pagamentos desta fatura serão apagados e os itens voltam a pendente. Use para corrigir um pagamento equivocado."
        confirmLabel="Reabrir"
        isPending={isPending}
        onConfirm={handleReopen}
      />
      <ConfirmDialog
        open={paymentToRemove != null}
        onOpenChange={(open) => {
          if (!open) setPaymentToRemove(null);
        }}
        title="Remover pagamento"
        description={
          isPaid
            ? "A despesa deste pagamento será apagada e a fatura deixará de estar quitada (itens voltam a pendente)."
            : "A despesa deste pagamento será apagada e o valor volta a constar como devido na fatura."
        }
        confirmLabel="Remover"
        isPending={isPending}
        onConfirm={handleRemovePayment}
      />
    </Card>
  );
}

export function InvoiceTimeline({
  invoices,
  accounts,
  categories,
  labelByDueMonth = false,
}: {
  invoices: InvoiceWithPayments[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  /** `credit_cards.invoice_name_by_due_month` do cartão desta timeline. */
  labelByDueMonth?: boolean;
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
          labelByDueMonth={labelByDueMonth}
        />
      ))}
    </div>
  );
}
