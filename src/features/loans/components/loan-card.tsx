"use client";

import * as React from "react";
import {
  Banknote,
  CheckCircle2,
  HandCoins,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { formatDateBR } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { deleteLoan, markLoanInstallmentPaid } from "../actions";
import type { LoanWithProgress } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export function LoanCard({ loan }: { loan: LoanWithProgress }) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const isSettled = loan.paidCount >= loan.installments_total;
  const pct = Math.round((loan.paidCount / loan.installments_total) * 100);

  function handlePayNext() {
    if (!loan.nextInstallment) return;
    startTransition(async () => {
      const result = await markLoanInstallmentPaid(loan.nextInstallment!.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Parcela marcada como paga.");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteLoan(loan.id);
      if (!result.ok) {
        toast.error(result.error);
        setDeleteOpen(false);
        return;
      }
      toast.success("Empréstimo excluído.");
      setDeleteOpen(false);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <HandCoins className="size-4.5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{loan.name}</p>
              {isSettled && (
                <Badge
                  variant="outline"
                  className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                >
                  <CheckCircle2 className="size-3" /> Quitado
                </Badge>
              )}
            </div>
            {loan.lender && (
              <p className="text-xs text-muted-foreground">{loan.lender}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-mt-1 -mr-2 text-muted-foreground"
                aria-label={`Ações do empréstimo ${loan.name}`}
              >
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setDeleteOpen(true)}
              >
                <Trash2 /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full",
                isSettled ? "bg-emerald-500" : "bg-amber-500",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 text-xs text-muted-foreground">
            <span>
              {loan.paidCount} de {loan.installments_total} parcelas ({pct}%)
            </span>
            <span>Saldo devedor {formatCents(loan.remainingCents)}</span>
          </div>
        </div>

        {!isSettled && loan.nextInstallment && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-secondary/50 px-3 py-2 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Banknote className="size-3.5" aria-hidden />
              Próxima: {formatCents(loan.nextInstallment.amountCents)} em{" "}
              {formatDateBR(loan.nextInstallment.dueDate)}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={handlePayNext}
            >
              Marcar paga
            </Button>
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir empréstimo"
        description={`"${loan.name}" será excluído por inteiro — as parcelas (pagas e pendentes) somem e, se houve valor creditado numa conta, essa receita também é removida. Os saldos voltam ao estado anterior.`}
        confirmLabel="Excluir"
        destructive
        isPending={isPending}
        onConfirm={handleDelete}
      />
    </Card>
  );
}
