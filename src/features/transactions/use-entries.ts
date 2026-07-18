"use client";

import * as React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import {
  fetchEntriesPage,
  type EntriesPage,
  type EntriesPageSize,
  type EntryFilters,
} from "./queries";

const DEFAULT_FILTERS: EntryFilters = {};

/**
 * Página atual da lista de transações. Para o estado padrão (sem filtros,
 * página 1, tamanho padrão) a primeira página vem do RSC (`initialFirstPage`)
 * — sem waterfall no client. `keepPreviousData` evita o flash de loading ao
 * trocar de página/tamanho (mantém a página anterior visível até a nova
 * chegar).
 */
export function useEntries(
  filters: EntryFilters,
  page: number,
  pageSize: EntriesPageSize,
  initialFirstPage?: EntriesPage,
) {
  const supabase = React.useMemo(() => createClient(), []);
  const isDefault = JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS);

  return useQuery({
    queryKey: ["entries", filters, page, pageSize],
    queryFn: () => fetchEntriesPage(supabase, filters, page, pageSize),
    placeholderData: keepPreviousData,
    initialData:
      isDefault && page === 1 && initialFirstPage
        ? initialFirstPage
        : undefined,
  });
}
