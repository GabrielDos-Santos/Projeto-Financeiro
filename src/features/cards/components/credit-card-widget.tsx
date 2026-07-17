"use client";

import * as React from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { deleteCard, setCardArchived } from "../actions";
import { bestPurchaseDay, type CardWithLimit } from "../types";
import { CardFormDialog } from "./card-form-dialog";
import { LimitBar } from "./limit-bar";
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

export function CreditCardWidget({ card }: { card: CardWithLimit }) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const color = card.color ?? "#8b5cf6";
  const isArchived = card.is_archived;

  function handleArchiveToggle() {
    startTransition(async () => {
      const result = await setCardArchived(card.id, !isArchived);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isArchived ? "Cartão reativado." : "Cartão arquivado.");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCard(card.id);
      if (!result.ok) {
        toast.error(result.error);
        setDeleteOpen(false);
        return;
      }
      toast.success("Cartão excluído.");
      setDeleteOpen(false);
    });
  }

  return (
    <Card className={cn(isArchived && "opacity-60")}>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `${color}1f`, color }}
          >
            <DomainIcon name={card.icon} className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{card.name}</p>
              {isArchived && <Badge variant="outline">Arquivado</Badge>}
            </div>
            {card.bank && (
              <p className="truncate text-xs text-muted-foreground">
                {card.bank}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-mt-1 -mr-2 text-muted-foreground"
                aria-label={`Ações do cartão ${card.name}`}
              >
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                <Pencil /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={handleArchiveToggle}
                disabled={isPending}
              >
                {isArchived ? (
                  <>
                    <ArchiveRestore /> Reativar
                  </>
                ) : (
                  <>
                    <Archive /> Arquivar
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

        <LimitBar
          limitCents={card.limit_cents}
          availableCents={card.availableCents}
          color={color}
        />

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Fatura aberta</p>
            <p className="font-medium">{formatCents(card.openInvoiceCents)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              Fecha dia {card.closing_day} · vence {card.due_day}
            </p>
            <p className="text-xs text-muted-foreground">
              Melhor compra: dia {bestPurchaseDay(card.closing_day)}
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" asChild className="w-full">
          <Link href={`/cartoes/${card.id}`}>
            Ver faturas <ChevronRight />
          </Link>
        </Button>
      </CardContent>

      <CardFormDialog card={card} open={editOpen} onOpenChange={setEditOpen} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir cartão"
        description={`O cartão "${card.name}" será excluído de forma permanente. Cartões com compras lançadas não podem ser excluídos — nesse caso, arquive.`}
        confirmLabel="Excluir"
        destructive
        isPending={isPending}
        onConfirm={handleDelete}
      />
    </Card>
  );
}
