"use client";

import * as React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import {
  fetchEntriesPage,
  type EntriesCursor,
  type EntriesPage,
  type EntryFilters,
} from "./queries";

const DEFAULT_FILTERS: EntryFilters = {};

/**
 * Infinite scroll da lista de transações. Para o estado sem filtros, a
 * primeira página vem do RSC (`initialFirstPage`) — sem waterfall no client.
 */
export function useEntries(
  filters: EntryFilters,
  initialFirstPage?: EntriesPage,
) {
  const supabase = React.useMemo(() => createClient(), []);
  const isDefault = JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS);

  return useInfiniteQuery({
    queryKey: ["entries", filters],
    queryFn: ({ pageParam }) => fetchEntriesPage(supabase, filters, pageParam),
    initialPageParam: null as EntriesCursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialData:
      isDefault && initialFirstPage
        ? { pages: [initialFirstPage], pageParams: [null] }
        : undefined,
  });
}
