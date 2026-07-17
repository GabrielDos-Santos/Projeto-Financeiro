"use client";

import * as React from "react";
import { ArrowLeftRight, Loader2, Plus } from "lucide-react";

import { useDebounce } from "@/hooks/use-debounce";
import type { EntriesPage, EntryFilters } from "../queries";
import { useEntries } from "../use-entries";
import type { AccountOption, CategoryOption, Entry } from "../types";
import { TransactionFilters } from "./transaction-filters";
import { TransactionFormDrawer } from "./transaction-form-drawer";
import { TransactionsTable } from "./transactions-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";

type DrawerState = {
  open: boolean;
  entry?: Entry;
  duplicate?: boolean;
};

export function TransactionsView({
  accounts,
  categories,
  initialFirstPage,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  initialFirstPage: EntriesPage;
}) {
  const [filters, setFilters] = React.useState<EntryFilters>({});
  const debouncedSearch = useDebounce(filters.search, 300);
  const effectiveFilters = React.useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );

  const [drawer, setDrawer] = React.useState<DrawerState>({ open: false });

  const query = useEntries(effectiveFilters, initialFirstPage);
  const entries = React.useMemo(
    () => query.data?.pages.flatMap((page) => page.entries) ?? [],
    [query.data],
  );

  // Sentinela de infinite scroll: carrega a próxima página ao entrar na tela.
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;
  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;
    const observer = new IntersectionObserver((observed) => {
      if (observed[0]?.isIntersecting && !isFetchingNextPage) {
        fetchNextPage();
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, entries.length]);

  const hasFilters = Object.values(effectiveFilters).some(Boolean);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <TransactionFilters
            filters={filters}
            onFiltersChange={setFilters}
            accounts={accounts}
            categories={categories}
          />
        </div>
        <Button onClick={() => setDrawer({ open: true })}>
          <Plus /> Novo lançamento
        </Button>
      </div>

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
              onEdit={(entry) => setDrawer({ open: true, entry })}
              onDuplicate={(entry) =>
                setDrawer({ open: true, entry, duplicate: true })
              }
            />
            <div ref={sentinelRef} aria-hidden />
            {isFetchingNextPage && (
              <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Carregando mais…
              </div>
            )}
            {hasNextPage && !isFetchingNextPage && (
              <div className="flex justify-center py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchNextPage()}
                >
                  Carregar mais
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <TransactionFormDrawer
        key={`${drawer.entry?.id ?? "new"}-${drawer.duplicate ?? false}`}
        accounts={accounts}
        categories={categories}
        open={drawer.open}
        onOpenChange={(open) => setDrawer((state) => ({ ...state, open }))}
        entry={drawer.entry}
        duplicate={drawer.duplicate}
      />
    </div>
  );
}
