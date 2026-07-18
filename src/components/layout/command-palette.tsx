"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { formatDateBR } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { useDebounce } from "@/hooks/use-debounce";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { DomainIcon } from "@/components/shared/domain-icon";
import { NAV_ITEMS, SETTINGS_ITEM } from "./nav-items";

export const COMMAND_PALETTE_OPEN_EVENT = "command-palette:open";

type EntryHit = {
  id: string;
  description: string;
  date: string;
  amount_cents: number;
  category_icon: string | null;
  category_color: string | null;
};

/**
 * Busca por descrição em `v_entries` — mesma fonte canônica de leitura das
 * demais telas. `%`/`_` removidos (curingas do ILIKE) para busca literal.
 * Categoria resolvida numa 2ª query (PostgREST não embeda relacionamentos
 * automaticamente em views — sem FK visível, diferente de tabelas normais).
 */
function useEntrySearch(term: string) {
  const supabase = React.useMemo(() => createClient(), []);
  const debounced = useDebounce(term, 250);
  const cleaned = debounced.replace(/[%_]/g, "").trim();

  return useQuery({
    queryKey: ["command-palette-search", cleaned],
    enabled: cleaned.length >= 2,
    queryFn: async (): Promise<EntryHit[]> => {
      const [entriesResult, categoriesResult] = await Promise.all([
        supabase
          .from("v_entries")
          .select("id, description, date, amount_cents, category_id")
          .ilike("description", `%${cleaned}%`)
          .order("date", { ascending: false })
          .limit(8),
        supabase.from("categories").select("id, icon, color"),
      ]);
      if (entriesResult.error) return [];

      const categoryById = new Map(
        (categoriesResult.data ?? []).map((c) => [c.id, c]),
      );

      return (entriesResult.data ?? []).map((row) => {
        const category = row.category_id
          ? categoryById.get(row.category_id)
          : undefined;
        return {
          id: row.id ?? "",
          description: row.description ?? "",
          date: row.date ?? "",
          amount_cents: row.amount_cents ?? 0,
          category_icon: category?.icon ?? null,
          category_color: category?.color ?? null,
        };
      });
    },
  });
}

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const router = useRouter();
  const entriesQuery = useEntrySearch(search);

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key === "k";
      if (!isShortcut) return;
      event.preventDefault();
      setOpen((current) => !current);
    }
    // Botão de busca da Topbar (sem atalho de teclado, ex.: mobile) dispara
    // este evento — mais simples que subir estado por um layout de servidor.
    function handleOpenRequest() {
      setOpen(true);
    }
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener(COMMAND_PALETTE_OPEN_EVENT, handleOpenRequest);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener(COMMAND_PALETTE_OPEN_EVENT, handleOpenRequest);
    };
  }, []);

  React.useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const entries = entriesQuery.data ?? [];
  const showSearchResults = search.trim().length >= 2;

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Pesquisa global"
      description="Busque lançamentos ou navegue pelo app"
    >
      <CommandInput
        placeholder="Buscar lançamentos ou navegar…"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        {showSearchResults ? (
          <>
            {entriesQuery.isFetching && entries.length === 0 && (
              <CommandEmpty>Buscando…</CommandEmpty>
            )}
            {!entriesQuery.isFetching && entries.length === 0 && (
              <CommandEmpty>Nenhum lançamento encontrado.</CommandEmpty>
            )}
            {entries.length > 0 && (
              <CommandGroup heading="Lançamentos">
                {entries.map((entry) => (
                  <CommandItem
                    key={entry.id}
                    value={`entry-${entry.id}`}
                    onSelect={() => go("/transacoes")}
                  >
                    <span
                      className="shrink-0"
                      style={{ color: entry.category_color ?? undefined }}
                    >
                      <DomainIcon
                        name={entry.category_icon}
                        className="size-4"
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {entry.description}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateBR(entry.date)} ·{" "}
                      {formatCents(entry.amount_cents)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        ) : (
          <>
            <CommandGroup heading="Ações rápidas">
              <CommandItem
                value="nova-transacao"
                onSelect={() => go("/transacoes?novo=1")}
              >
                <Plus /> Novo lançamento
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Navegar">
              {[...NAV_ITEMS, SETTINGS_ITEM].map((item) => (
                <CommandItem
                  key={item.href}
                  value={`nav-${item.label}`}
                  onSelect={() => go(item.href)}
                >
                  <item.icon />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
