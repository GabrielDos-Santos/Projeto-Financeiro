"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  Ban,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  MoreVertical,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { formatDateBR } from "@/lib/dates";
import { cn } from "@/lib/utils";
import {
  deleteEntry,
  setEntryStatus,
  setInstallmentStatus,
  updateEntryCategory,
} from "../actions";
import {
  signedAmountCents,
  type AccountOption,
  type CardOption,
  type CategoryOption,
  type Entry,
} from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { HistoricalBadge } from "@/components/shared/historical-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DomainIcon } from "@/components/shared/domain-icon";
import { MoneyDisplay } from "@/components/shared/money-display";

export function entryTarget(entry: Entry) {
  return entry.transfer_group_id
    ? { transferGroupId: entry.transfer_group_id }
    : { transactionId: entry.transaction_id! };
}

function StatusBadge({ status }: { status: Entry["status"] }) {
  if (status === "paid") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
      >
        Pago
      </Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/40 text-amber-600 dark:text-amber-400"
      >
        Pendente
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Cancelada
    </Badge>
  );
}

// React.memo (§10): com infinite scroll a lista cresce — sem memo, cada nova
// página re-renderizaria TODAS as linhas anteriores. Exige callbacks estáveis
// (useCallback) e Maps memoizados nos props — garantidos pela TransactionsView.
const EntryRow = React.memo(function EntryRow({
  entry,
  accountsById,
  categoriesById,
  categories,
  cardsById,
  selected,
  onToggleSelect,
  onEdit,
  onDuplicate,
}: {
  entry: Entry;
  accountsById: Map<string, AccountOption>;
  categoriesById: Map<string, CategoryOption>;
  categories: CategoryOption[];
  cardsById: Map<string, CardOption>;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (entry: Entry) => void;
  onDuplicate: (entry: Entry) => void;
}) {
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const isTransfer = entry.type === "transfer";
  const isInstallment = entry.entry_kind === "installment";
  const isCard = entry.credit_card_id != null;
  const category = entry.category_id
    ? categoriesById.get(entry.category_id)
    : undefined;
  const account = entry.account_id
    ? accountsById.get(entry.account_id)
    : undefined;
  const card = entry.credit_card_id
    ? cardsById.get(entry.credit_card_id)
    : undefined;
  const cancelled = entry.status === "cancelled";
  // Itens de cartão têm status governado pelo pagamento da fatura (Fase 6) e
  // não podem ser editados pelo fluxo de conta (violaria "um dono só"): só
  // permitimos excluir.
  const locked = isInstallment || isCard;

  function changeStatus(status: "paid" | "pending" | "cancelled") {
    startTransition(async () => {
      // Parcela tem status próprio em transaction_installments (D4);
      // o restante opera em transactions (par inteiro se transferência).
      const result = isInstallment
        ? await setInstallmentStatus(entry.id, status)
        : await setEntryStatus(entryTarget(entry), status);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteEntry(entryTarget(entry));
      if (!result.ok) {
        toast.error(result.error);
        setDeleteOpen(false);
        return;
      }
      toast.success(
        isTransfer ? "Transferência excluída." : "Lançamento excluído.",
      );
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      setDeleteOpen(false);
    });
  }

  function handleCategoryChange(categoryId: string) {
    startTransition(async () => {
      const result = await updateEntryCategory(entry.transaction_id, categoryId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    });
  }

  return (
    <TableRow className={cn(cancelled && "opacity-50")} data-state={selected ? "selected" : undefined}>
      <TableCell className="w-10">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelect(entry.id!)}
          aria-label={`Selecionar ${entry.description}`}
        />
      </TableCell>
      <TableCell className="text-muted-foreground">
        {entry.date ? formatDateBR(entry.date) : "—"}
      </TableCell>
      <TableCell className="max-w-64">
        <span
          className={cn(
            "block truncate font-medium",
            cancelled && "line-through",
          )}
        >
          {entry.description}
          {entry.installment_number != null && (
            <span className="font-normal text-muted-foreground">
              {" "}
              · parcela {entry.installment_number}
            </span>
          )}
        </span>
      </TableCell>
      <TableCell>
        {isTransfer ? (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ArrowLeftRight className="size-3.5" aria-hidden />
            Transferência (
            {entry.transfer_direction === "out" ? "saída" : "entrada"})
          </span>
        ) : locked ? (
          // Único campo editável em item travado (decisão 33/36): trocar
          // tipo/conta/cartão violaria "um dono só" ou o vínculo com a
          // fatura, mas a categoria é segura de liberar.
          <Select
            value={entry.category_id ?? ""}
            onValueChange={handleCategoryChange}
            disabled={isPending}
          >
            <SelectTrigger
              size="sm"
              className="h-7 w-full border-transparent bg-transparent px-2 shadow-none hover:border-input"
            >
              <SelectValue placeholder="Escolha" />
            </SelectTrigger>
            <SelectContent>
              {categories
                .filter((c) => c.type === entry.type)
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <DomainIcon name={c.icon} className="size-3.5" />
                    {c.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        ) : category ? (
          <span className="flex items-center gap-1.5 text-sm">
            <span style={{ color: category.color ?? undefined }}>
              <DomainIcon name={category.icon} className="size-3.5" />
            </span>
            {category.name}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {card ? (
          <span className="flex items-center gap-1.5">
            <CreditCard className="size-3.5" aria-hidden />
            {card.name}
          </span>
        ) : (
          (account?.name ?? "—")
        )}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-1">
          <StatusBadge status={entry.status} />
          {entry.affects_balance === false && <HistoricalBadge />}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <MoneyDisplay
          cents={signedAmountCents(entry)}
          colorBySign={!cancelled}
          className={cn(
            "font-medium",
            cancelled && "text-muted-foreground line-through",
          )}
        />
      </TableCell>
      <TableCell className="w-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground"
              aria-label={`Ações de ${entry.description}`}
            >
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!locked && (
              <>
                <DropdownMenuItem onSelect={() => onEdit(entry)}>
                  <Pencil /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onDuplicate(entry)}>
                  <Copy /> Duplicar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {/* Status de compra no cartão é definido pelo pagamento da fatura. */}
            {!isCard && entry.status !== "paid" && (
              <DropdownMenuItem
                onSelect={() => changeStatus("paid")}
                disabled={isPending}
              >
                <CheckCircle2 /> Marcar como pago
              </DropdownMenuItem>
            )}
            {!isCard && entry.status !== "pending" && (
              <DropdownMenuItem
                onSelect={() => changeStatus("pending")}
                disabled={isPending}
              >
                {cancelled ? <RotateCcw /> : <Clock />}
                {cancelled
                  ? isInstallment
                    ? "Reativar parcela"
                    : "Reativar (pendente)"
                  : isInstallment
                    ? "Marcar parcela como pendente"
                    : "Marcar como pendente"}
              </DropdownMenuItem>
            )}
            {!isCard && !cancelled && (
              <DropdownMenuItem
                onSelect={() => changeStatus("cancelled")}
                disabled={isPending}
              >
                <Ban /> Cancelar
              </DropdownMenuItem>
            )}
            {!isCard && <DropdownMenuSeparator />}
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setDeleteOpen(true)}
            >
              <Trash2 /> {isInstallment ? "Excluir compra inteira" : "Excluir"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title={
            isInstallment
              ? "Excluir compra parcelada"
              : isTransfer
                ? "Excluir transferência"
                : "Excluir lançamento"
          }
          description={
            isInstallment
              ? `A compra "${entry.description}" será excluída POR INTEIRO — todas as parcelas somem, inclusive as já pagas.`
              : isTransfer
                ? "As duas pernas da transferência (saída e entrada) serão excluídas de forma permanente."
                : `"${entry.description}" será excluído de forma permanente.`
          }
          confirmLabel="Excluir"
          destructive
          isPending={isPending}
          onConfirm={handleDelete}
        />
      </TableCell>
    </TableRow>
  );
});

export function TransactionsTable({
  entries,
  accounts,
  categories,
  cards,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDuplicate,
}: {
  entries: Entry[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  cards: CardOption[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onEdit: (entry: Entry) => void;
  onDuplicate: (entry: Entry) => void;
}) {
  const accountsById = React.useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );
  const categoriesById = React.useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );
  const cardsById = React.useMemo(
    () => new Map(cards.map((c) => [c.id, c])),
    [cards],
  );

  const allSelected =
    entries.length > 0 && entries.every((e) => selectedIds.has(e.id!));
  const someSelected = entries.some((e) => selectedIds.has(e.id!));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={(checked) => onToggleSelectAll(Boolean(checked))}
              aria-label="Selecionar todos os lançamentos desta página"
            />
          </TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead>Categoria</TableHead>
          <TableHead>Conta</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            accountsById={accountsById}
            categoriesById={categoriesById}
            categories={categories}
            cardsById={cardsById}
            selected={selectedIds.has(entry.id!)}
            onToggleSelect={onToggleSelect}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
          />
        ))}
      </TableBody>
    </Table>
  );
}
