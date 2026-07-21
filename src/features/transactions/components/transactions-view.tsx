"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useDebounce } from "@/hooks/use-debounce";
import { deleteEntries } from "../actions";
import {
  DEFAULT_ENTRIES_PAGE_SIZE,
  DEFAULT_ENTRY_SORT,
  ENTRIES_PAGE_SIZE_OPTIONS,
  type EntriesPage,
  type EntriesPageSize,
  type EntryFilters,
  type EntrySort,
} from "../queries";
import { useEntries } from "../use-entries";
import type {
  AccountOption,
  CardOption,
  CategoryOption,
  Entry,
} from "../types";
import { TransactionFilters } from "./transaction-filters";
import { TransactionFormDrawer } from "./transaction-form-drawer";
import { entryTarget, TransactionsTable } from "./transactions-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";

type DrawerState = {
  open: boolean;
  entry?: Entry;
  duplicate?: boolean;
};

export function TransactionsView({
  accounts,
  categories,
  cards,
  ownAccounts,
  ownCategories,
  ownCards,
  initialFirstPage,
  myUserId,
  isAdmin,
  memberNames,
  memberOptions,
}: {
  /** Tudo que o usuário ENXERGA — resolve os rótulos das linhas da tabela. */
  accounts: AccountOption[];
  categories: CategoryOption[];
  cards: CardOption[];
  /** Só o que é DO usuário — alimenta seletores de formulário e filtros. */
  ownAccounts: AccountOption[];
  ownCategories: CategoryOption[];
  ownCards: CardOption[];
  initialFirstPage: EntriesPage;
  /** Dono da sessão — para saber quando um lançamento é de outro membro. */
  myUserId: string;
  /** Admin de casa: vê tudo + filtra por membro. Membro comum fica preso ao
   * próprio `user_id` (senão veria lançamentos de contas compartilhadas). */
  isAdmin: boolean;
  /** `null` fora de uma casa (Fase 16) — a maioria dos usuários. */
  memberNames: Record<string, string> | null;
  /** Membros para o filtro "por membro" — vazio se não for admin de casa. */
  memberOptions: { id: string; name: string }[];
}) {
  const [filters, setFilters] = React.useState<EntryFilters>({});
  const debouncedSearch = useDebounce(filters.search, 300);
  // Filtros sempre aplicados: membro comum trancado no próprio `user_id`.
  // Vem por ÚLTIMO no merge para que nem um filtro manual o sobrescreva.
  const baseFilters = React.useMemo<EntryFilters>(
    () => (isAdmin ? {} : { userId: myUserId }),
    [isAdmin, myUserId],
  );
  const effectiveFilters = React.useMemo(
    () => ({ ...filters, search: debouncedSearch, ...baseFilters }),
    [filters, debouncedSearch, baseFilters],
  );

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState<EntriesPageSize>(
    DEFAULT_ENTRIES_PAGE_SIZE,
  );
  const [sort, setSort] = React.useState<EntrySort>(DEFAULT_ENTRY_SORT);
  // Filtro, tamanho de página ou ordenação mudou: a "página atual" pode não
  // fazer mais sentido — sempre volta ao início.
  React.useEffect(() => {
    setPage(1);
  }, [effectiveFilters, pageSize, sort]);

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [isBulkDeleting, startBulkDelete] = React.useTransition();

  const [drawer, setDrawer] = React.useState<DrawerState>({ open: false });

  // Callbacks estáveis: pré-requisito do React.memo nas linhas da tabela
  // (inline arrows quebrariam o memo a cada render — decisão 53).
  const handleEdit = React.useCallback((entry: Entry) => {
    setDrawer({ open: true, entry });
  }, []);
  const handleDuplicate = React.useCallback((entry: Entry) => {
    setDrawer({ open: true, entry, duplicate: true });
  }, []);

  // Vindo da Command Palette ("Novo lançamento" → /transacoes?novo=1):
  // abre o drawer já na carga e limpa a query string (não fica no histórico).
  const router = useRouter();
  const searchParams = useSearchParams();
  React.useEffect(() => {
    if (searchParams.get("novo") === "1") {
      setDrawer({ open: true });
      router.replace("/transacoes");
    }
  }, [searchParams, router]);

  const query = useEntries(
    effectiveFilters,
    page,
    pageSize,
    sort,
    initialFirstPage,
    baseFilters,
  );
  const entries = React.useMemo(() => query.data?.entries ?? [], [query.data]);
  const totalCount = query.data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Seleção não sobrevive à troca de página/filtro/tamanho (evita apagar por
  // engano algo que não está mais visível na tela).
  React.useEffect(() => {
    setSelectedIds(new Set());
  }, [effectiveFilters, page, pageSize]);

  const handleToggleSelect = React.useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const handleToggleSelectAll = React.useCallback(
    (checked: boolean) => {
      setSelectedIds(checked ? new Set(entries.map((e) => e.id!)) : new Set());
    },
    [entries],
  );

  const queryClient = useQueryClient();
  function handleBulkDelete() {
    const targets = entries
      .filter((entry) => selectedIds.has(entry.id!))
      .map(entryTarget);
    startBulkDelete(async () => {
      const result = await deleteEntries(targets);
      if (!result.ok) {
        toast.error(result.error);
        setBulkDeleteOpen(false);
        return;
      }
      toast.success(
        result.data.deletedCount === 1
          ? "1 lançamento excluído."
          : `${result.data.deletedCount} lançamentos excluídos.`,
      );
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    });
  }

  // Só os filtros que o USUÁRIO escolheu contam para o estado vazio — o
  // `baseFilters` (user_id do membro comum) é sempre presente e não deve
  // fazer a tela dizer "ajuste os filtros" quando ele simplesmente não tem
  // lançamentos.
  const hasFilters = Object.values({
    ...filters,
    search: debouncedSearch,
  }).some(Boolean);
  const selectedCount = selectedIds.size;

  return (
    <div className="flex flex-col gap-4">
      {/* Mobile: coluna (filtros em cima, botão full-width embaixo). O layout
       * antigo (`min-w-0 flex-1` + botão na mesma linha) deixava o contêiner
       * dos filtros encolher ALÉM do min-content da busca — o input vazava
       * por baixo do botão "Novo lançamento" (overlap reportado em ~390px). */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 sm:flex-1">
          <TransactionFilters
            filters={filters}
            onFiltersChange={setFilters}
            sort={sort}
            onSortChange={setSort}
            accounts={ownAccounts}
            categories={ownCategories}
            memberOptions={memberOptions}
          />
        </div>
        <Button
          onClick={() => setDrawer({ open: true })}
          className="w-full sm:w-auto"
        >
          <Plus /> Novo lançamento
        </Button>
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-secondary/50 px-3 py-2 text-sm">
          <span>
            {selectedCount === 1
              ? "1 lançamento selecionado"
              : `${selectedCount} lançamentos selecionados`}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              <X /> Limpar seleção
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 /> Excluir selecionados
            </Button>
          </div>
        </div>
      )}

      {query.isPending ? (
        <Card>
          <CardContent className="space-y-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title={hasFilters ? "Nada por aqui" : "Nenhum lançamento ainda"}
          description={
            hasFilters
              ? "Nenhum lançamento corresponde aos filtros. Ajuste ou limpe os filtros."
              : "Crie seu primeiro lançamento — receita, despesa ou transferência entre contas."
          }
        >
          {!hasFilters && (
            <Button onClick={() => setDrawer({ open: true })}>
              <Plus /> Criar primeiro lançamento
            </Button>
          )}
        </EmptyState>
      ) : (
        <Card className="py-2">
          <CardContent className="px-2">
            <TransactionsTable
              entries={entries}
              accounts={accounts}
              categories={categories}
              ownCategories={ownCategories}
              cards={cards}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              myUserId={myUserId}
              memberNames={memberNames}
            />
            {/* Mobile: coluna centralizada (navegação em cima, contagem
             * embaixo) — na linha única os dois grupos não cabem em ~390px
             * e o wrap os deixava desalinhados. */}
            <div className="flex flex-col-reverse items-center gap-3 border-t px-2 pt-3 sm:flex-row sm:flex-wrap sm:justify-between">
              <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
                <span>Por página</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) =>
                    setPageSize(Number(v) as EntriesPageSize)
                  }
                >
                  <SelectTrigger size="sm" className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTRIES_PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>
                  {totalCount === 0
                    ? "0 lançamentos"
                    : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalCount)} de ${totalCount}`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Página anterior"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft />
                </Button>
                <span className="w-24 text-center text-sm text-muted-foreground">
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Próxima página"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Excluir lançamentos selecionados?"
        description={`${selectedCount === 1 ? "1 lançamento será excluído" : `${selectedCount} lançamentos serão excluídos`} permanentemente. Transferências e compras parceladas selecionadas são removidas por inteiro (todas as pernas/parcelas).`}
        confirmLabel="Excluir"
        destructive
        isPending={isBulkDeleting}
        onConfirm={handleBulkDelete}
      />

      <TransactionFormDrawer
        key={`${drawer.entry?.id ?? "new"}-${drawer.duplicate ?? false}`}
        accounts={ownAccounts}
        categories={ownCategories}
        cards={ownCards}
        open={drawer.open}
        onOpenChange={(open) => setDrawer((state) => ({ ...state, open }))}
        entry={drawer.entry}
        duplicate={drawer.duplicate}
      />
    </div>
  );
}
