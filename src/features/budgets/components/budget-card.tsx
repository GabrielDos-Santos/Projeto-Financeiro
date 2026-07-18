"use client";

import * as React from "react";
import { AlertTriangle, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CategoryOption } from "@/features/transactions/types";
import { deleteBudget } from "../actions";
import type { BudgetUsage } from "../types";
import { BudgetFormDialog } from "./budget-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DomainIcon } from "@/components/shared/domain-icon";

export function BudgetCard({
  budget,
  month,
  availableCategories,
}: {
  budget: BudgetUsage;
  month: string;
  availableCategories: CategoryOption[];
}) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const spent = budget.spent_cents ?? 0;
  const amount = budget.amount_cents ?? 1;
  const ratio = Math.min(1, spent / amount);
  const alertReached = Boolean(budget.alert_reached);
  const overBudget = spent > amount;
  const color = budget.category_color ?? "#71717a";

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteBudget(budget.budget_id);
      if (!result.ok) {
        toast.error(result.error);
        setDeleteOpen(false);
        return;
      }
      toast.success("Orçamento excluído.");
      setDeleteOpen(false);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `${color}1f`, color }}
          >
            <DomainIcon name={budget.category_icon} className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{budget.category_name}</p>
              {alertReached && (
                <Badge
                  variant="outline"
                  className={cn(
                    overBudget
                      ? "border-destructive/40 text-destructive"
                      : "border-amber-500/40 text-amber-600 dark:text-amber-400",
                  )}
                >
                  <AlertTriangle className="size-3" />{" "}
                  {overBudget ? "Estourado" : "Alerta"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCents(spent)} de {formatCents(amount)}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-mt-1 -mr-2 size-8 text-muted-foreground"
                aria-label={`Ações do orçamento de ${budget.category_name}`}
              >
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                <Pencil /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
                overBudget
                  ? "bg-destructive"
                  : alertReached
                    ? "bg-amber-500"
                    : undefined,
              )}
              style={{
                width: `${Math.round(ratio * 100)}%`,
                backgroundColor: overBudget || alertReached ? undefined : color,
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {Math.round((budget.usage_ratio ?? 0) * 100)}% usado · alerta em{" "}
            {Math.round((budget.alert_threshold ?? 0.8) * 100)}%
          </p>
        </div>
      </CardContent>

      <BudgetFormDialog
        budget={budget}
        month={month}
        availableCategories={availableCategories}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir orçamento"
        description={`O orçamento de "${budget.category_name}" para este mês será excluído.`}
        confirmLabel="Excluir"
        destructive
        isPending={isPending}
        onConfirm={handleDelete}
      />
    </Card>
  );
}
