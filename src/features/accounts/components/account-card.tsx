"use client";

import * as React from "react";
import {
  Archive,
  ArchiveRestore,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { deleteAccount, setAccountArchived } from "../actions";
import { ACCOUNT_TYPE_LABELS, type AccountWithBalance } from "../types";
import { AccountFormDialog } from "./account-form-dialog";
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
import { cn } from "@/lib/utils";

export function AccountCard({ account }: { account: AccountWithBalance }) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const isArchived = Boolean(account.is_archived);
  const color = account.color ?? "#71717a";

  function handleArchiveToggle() {
    startTransition(async () => {
      const result = await setAccountArchived(account.account_id, !isArchived);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isArchived ? "Conta reativada." : "Conta arquivada.");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAccount(account.account_id);
      if (!result.ok) {
        toast.error(result.error);
        setDeleteOpen(false);
        return;
      }
      toast.success("Conta excluída.");
      setDeleteOpen(false);
    });
  }

  return (
    <Card className={cn(isArchived && "opacity-60")}>
      <CardContent className="flex items-start gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}1f`, color }}
        >
          <DomainIcon name={account.icon} className="size-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{account.name}</p>
            {isArchived && <Badge variant="outline">Arquivada</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            {account.type ? ACCOUNT_TYPE_LABELS[account.type] : "—"}
          </p>
          <MoneyDisplay
            cents={account.balance_cents ?? 0}
            colorBySign
            className="block text-lg font-semibold"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="-mt-1 -mr-2 text-muted-foreground"
              aria-label={`Ações da conta ${account.name}`}
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
      </CardContent>

      <AccountFormDialog
        account={account}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir conta"
        description={`A conta "${account.name}" será excluída de forma permanente. Contas com lançamentos não podem ser excluídas — nesse caso, arquive.`}
        confirmLabel="Excluir"
        destructive
        isPending={isPending}
        onConfirm={handleDelete}
      />
    </Card>
  );
}
