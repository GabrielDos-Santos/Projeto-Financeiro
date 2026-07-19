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
  User,
} from "lucide-react";
import { toast } from "sonner";

import { formatDateBR } from "@/lib/dates";
import { ownerName } from "@/lib/households";
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
import { MemberBadge } from "@/components/shared/member-badge";
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

/**
 * Estado e ações compartilhados entre `EntryRow` (tabela, desktop) e
 * `EntryCard` (lista em cards, mobile — Fase 15) — mesma lógica de negócio,
 * dois layouts. Extraído para não duplicar as Server Actions/transições em
 * dois componentes.
 */
function useEntryRowState(
  entry: Entry,
  accountsById: Map<string, AccountOption>,
  categoriesById: Map<string, CategoryOption>,
  cardsById: Map<string, CardOption>,
) {
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
      const result = await updateEntryCategory(
        entry.transaction_id,
        categoryId,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    });
  }

  return {
    deleteOpen,
    setDeleteOpen,
    isPending,
    isTransfer,
    isInstallment,
    isCard,
    category,
    account,
    card,
    cancelled,
    locked,
    changeStatus,
    handleDelete,
    handleCategoryChange,
  };
}

/** Menu "..." de ações — idêntico em `EntryRow` e `EntryCard`. */
function EntryActionsMenu({
  entry,
  state,
  onEdit,
  onDuplicate,
  triggerClassName,
}: {
  entry: Entry;
  state: ReturnType<typeof useEntryRowState>;
  onEdit: (entry: Entry) => void;
  onDuplicate: (entry: Entry) => void;
  triggerClassName?: string;
}) {
  const {
    isPending,
    isTransfer,
    isInstallment,
    isCard,
    cancelled,
    locked,
    changeStatus,
    handleDelete,
    deleteOpen,
    setDeleteOpen,
  } = state;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "size-11 text-muted-foreground sm:size-8",
              triggerClassName,
            )}
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
    </>
  );
}

/** Categoria: select inline em item travado (decisão 33/36/71), texto nos demais. */
function EntryCategoryField({
  entry,
  category,
  categories,
  locked,
  isPending,
  onCategoryChange,
}: {
  entry: Entry;
  category: CategoryOption | undefined;
  categories: CategoryOption[];
  locked: boolean;
  isPending: boolean;
  onCategoryChange: (categoryId: string) => void;
}) {
  if (entry.type === "transfer") {
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <ArrowLeftRight className="size-3.5" aria-hidden />
        Transferência ({entry.transfer_direction === "out" ? "saída" : "entrada"})
      </span>
    );
  }
  if (locked) {
    return (
      <Select
        value={entry.category_id ?? ""}
        onValueChange={onCategoryChange}
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
    );
  }
  if (category) {
    return (
      <span className="flex items-center gap-1.5 text-sm">
        <span style={{ color: category.color ?? undefined }}>
          <DomainIcon name={category.icon} className="size-3.5" />
        </span>
        {category.name}
      </span>
    );
  }
  return <span className="text-sm text-muted-foreground">—</span>;
}

/**
 * Lista em cards para telas pequenas (Fase 15) — a mesma tabela densa de 8
 * colunas não cabe em ~375px sem rolagem horizontal, que é exatamente o que
 * o checklist de responsividade da Fase 15 pede pra evitar.
 */
function EntryCard({
  entry,
  accountsById,
  categoriesById,
  categories,
  cardsById,
  selected,
  onToggleSelect,
  onEdit,
  onDuplicate,
  myUserId,
  memberNames,
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
  myUserId: string;
  memberNames: Record<string, string> | null;
}) {
  const state = useEntryRowState(entry, accountsById, categoriesById, cardsById);
  const { isPending, cancelled, category, account, card, locked, handleCategoryChange } =
    state;
  const owner = ownerName(entry.user_id, myUserId, memberNames);

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border p-3",
        cancelled && "opacity-50",
        selected && "border-primary/50 bg-accent/40",
      )}
      data-state={selected ? "selected" : undefined}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggleSelect(entry.id!)}
        aria-label={`Selecionar ${entry.description}`}
        className="mt-2.5"
      />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "text-sm font-medium wrap-break-word",
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
          <MoneyDisplay
            cents={signedAmountCents(entry)}
            colorBySign={!cancelled}
            className={cn(
              "shrink-0 font-medium",
              cancelled && "text-muted-foreground line-through",
            )}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{entry.date ? formatDateBR(entry.date) : "—"}</span>
          <span className="flex items-center gap-1.5">
            {card ? (
              <>
                <CreditCard className="size-3.5" aria-hidden />
                {card.name}
              </>
            ) : (
              (account?.name ?? "—")
            )}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <EntryCategoryField
              entry={entry}
              category={category}
              categories={categories}
              locked={locked}
              isPending={isPending}
              onCategoryChange={handleCategoryChange}
            />
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            {owner && <MemberBadge name={owner} />}
            <StatusBadge status={entry.status} />
            {entry.affects_balance === false && <HistoricalBadge />}
          </div>
        </div>
      </div>
      <EntryActionsMenu
        entry={entry}
        state={state}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        triggerClassName="-mt-1 -mr-1"
      />
    </div>
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
  myUserId,
  memberNames,
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
  myUserId: string;
  memberNames: Record<string, string> | null;
}) {
  const state = useEntryRowState(entry, accountsById, categoriesById, cardsById);
  const { cancelled, category, account, card, locked, handleCategoryChange, isPending } =
    state;
  const owner = ownerName(entry.user_id, myUserId, memberNames);

  return (
    <TableRow
      className={cn(cancelled && "opacity-50")}
      data-state={selected ? "selected" : undefined}
    >
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
        <EntryCategoryField
          entry={entry}
          category={category}
          categories={categories}
          locked={locked}
          isPending={isPending}
          onCategoryChange={handleCategoryChange}
        />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        <div className="flex flex-col gap-0.5">
          {card ? (
            <span className="flex items-center gap-1.5">
              <CreditCard className="size-3.5" aria-hidden />
              {card.name}
            </span>
          ) : (
            (account?.name ?? "—")
          )}
          {owner && (
            <span className="flex items-center gap-1 text-xs">
              <User className="size-3" aria-hidden />
              {owner}
            </span>
          )}
        </div>
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
        <EntryActionsMenu
          entry={entry}
          state={state}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
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
  myUserId,
  memberNames,
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
  myUserId: string;
  memberNames: Record<string, string> | null;
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
    <>
      {/* ≥ sm: tabela densa de sempre. Abaixo disso os 8 campos por linha
       * não cabem sem rolagem horizontal — vira lista de cards (Fase 15). */}
      <Table className="hidden sm:table">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={
                  allSelected ? true : someSelected ? "indeterminate" : false
                }
                onCheckedChange={(checked) =>
                  onToggleSelectAll(Boolean(checked))
                }
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
              myUserId={myUserId}
              memberNames={memberNames}
            />
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-2 sm:hidden">
        <label className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <Checkbox
            checked={allSelected ? true : someSelected ? "indeterminate" : false}
            onCheckedChange={(checked) => onToggleSelectAll(Boolean(checked))}
            aria-label="Selecionar todos os lançamentos desta página"
          />
          Selecionar todos
        </label>
        {entries.map((entry) => (
          <EntryCard
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
            myUserId={myUserId}
            memberNames={memberNames}
          />
        ))}
      </div>
    </>
  );
}
