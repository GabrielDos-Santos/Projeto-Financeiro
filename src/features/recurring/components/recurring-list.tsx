"use client";

import * as React from "react";
import {
  CalendarClock,
  CreditCard,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { formatDateBR, todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { nextOccurrences } from "@/services/recurrence";
import type {
  AccountOption,
  CardOption,
  CategoryOption,
} from "@/features/transactions/types";
import { deleteRecurring, setRecurringActive } from "../actions";
import { frequencyLabel, type Recurring } from "../types";
import { RecurringFormDialog } from "./recurring-form-dialog";
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
import { MoneyDisplay } from "@/components/shared/money-display";

function RecurringCard({
  recurring,
  accounts,
  categories,
  cards,
}: {
  recurring: Recurring;
  accounts: AccountOption[];
  categories: CategoryOption[];
  cards: CardOption[];
}) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const category = categories.find((c) => c.id === recurring.category_id);
  const account = accounts.find((a) => a.id === recurring.account_id);
  const card = cards.find((c) => c.id === recurring.credit_card_id);
  const active = recurring.is_active;

  const signedAmount =
    recurring.type === "expense"
      ? -recurring.amount_cents
      : recurring.amount_cents;

  const upcoming = active
    ? nextOccurrences(
        recurring.start_date,
        recurring.frequency,
        recurring.interval_count,
        recurring.end_date,
        todayISO(),
        1,
      )[0]
    : undefined;

  function handleToggle() {
    startTransition(async () => {
      const result = await setRecurringActive(recurring.id, !active);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(active ? "Recorrência pausada." : "Recorrência retomada.");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteRecurring(recurring.id);
      if (!result.ok) {
        toast.error(result.error);
        setDeleteOpen(false);
        return;
      }
      toast.success("Recorrência excluída.");
      setDeleteOpen(false);
    });
  }

  return (
    <Card className={cn(!active && "opacity-60")}>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: `${category?.color ?? "#71717a"}1f`,
              color: category?.color ?? "#71717a",
            }}
          >
            <DomainIcon name={category?.icon ?? null} className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{recurring.description}</p>
              {!active && <Badge variant="outline">Pausada</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              {frequencyLabel(recurring.frequency, recurring.interval_count)}
              {category ? ` · ${category.name}` : ""}
            </p>
          </div>
          <MoneyDisplay
            cents={signedAmount}
            colorBySign
            className="font-semibold"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-mt-1 -mr-2 size-8 text-muted-foreground"
                aria-label={`Ações de ${recurring.description}`}
              >
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                <Pencil /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleToggle} disabled={isPending}>
                {active ? (
                  <>
                    <Pause /> Pausar
                  </>
                ) : (
                  <>
                    <Play /> Retomar
                  </>
                )}
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

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            {card ? (
              <>
                <CreditCard className="size-3.5" /> {card.name}
              </>
            ) : (
              <>
                <Wallet className="size-3.5" /> {account?.name ?? "—"}
              </>
            )}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarClock className="size-3.5" />
            {active
              ? upcoming
                ? `Próxima: ${formatDateBR(upcoming)}`
                : "Sem próximas ocorrências"
              : "Pausada"}
          </span>
        </div>
      </CardContent>

      <RecurringFormDialog
        recurring={recurring}
        accounts={accounts}
        categories={categories}
        cards={cards}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir recorrência"
        description={`O template "${recurring.description}" será excluído. Os lançamentos já gerados permanecem em Transações (apenas deixam de ser recorrentes).`}
        confirmLabel="Excluir"
        destructive
        isPending={isPending}
        onConfirm={handleDelete}
      />
    </Card>
  );
}

export function RecurringList({
  recurring,
  accounts,
  categories,
  cards,
}: {
  recurring: Recurring[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  cards: CardOption[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {recurring.map((item) => (
        <RecurringCard
          key={item.id}
          recurring={item}
          accounts={accounts}
          categories={categories}
          cards={cards}
        />
      ))}
    </div>
  );
}
