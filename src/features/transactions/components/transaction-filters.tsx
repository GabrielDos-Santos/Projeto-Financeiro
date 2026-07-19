"use client";

import * as React from "react";
import { ArrowDownUp, Search, SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  ENTRY_SORT_OPTIONS,
  type EntryFilters,
  type EntrySort,
} from "../queries";
import type { AccountOption, CategoryOption } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/shared/date-picker";

const ALL = "all";

function FilterSelect({
  value,
  onValueChange,
  placeholder,
  children,
}: {
  value: string | undefined;
  onValueChange: (value: string | undefined) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <Select
      value={value ?? ALL}
      onValueChange={(v) => onValueChange(v === ALL ? undefined : v)}
    >
      <SelectTrigger size="sm" className="w-full sm:w-auto sm:min-w-32">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}</SelectItem>
        {children}
      </SelectContent>
    </Select>
  );
}

export function TransactionFilters({
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  accounts,
  categories,
  memberOptions,
}: {
  filters: EntryFilters;
  onFiltersChange: (filters: EntryFilters) => void;
  sort: EntrySort;
  onSortChange: (sort: EntrySort) => void;
  accounts: AccountOption[];
  categories: CategoryOption[];
  /** Vazio quando o usuário não é admin de uma casa — o filtro nem aparece. */
  memberOptions: { id: string; name: string }[];
}) {
  const hasFilters = Object.values(filters).some(Boolean);
  // Só os filtros "secundários" (o campo de busca fica sempre visível) —
  // conta quantos estão ativos pro badge do botão "Filtros" no mobile.
  const secondaryFiltersCount = [
    filters.type,
    filters.status,
    filters.accountId,
    filters.categoryId,
    filters.userId,
    filters.from,
    filters.to,
  ].filter(Boolean).length;
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  function set<K extends keyof EntryFilters>(key: K, value: EntryFilters[K]) {
    onFiltersChange({ ...filters, [key]: value });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search ?? ""}
            onChange={(e) => set("search", e.target.value || undefined)}
            placeholder="Buscar por descrição…"
            className="h-8 pl-9"
          />
        </div>
        {/* Barra de filtros colapsável no mobile (Fase 15) — os 6 selects +
         * datas não cabem numa tela de ~375px sem empilhar várias linhas;
         * a partir do sm eles já ficam visíveis (ver classe do container
         * abaixo), então este botão nem aparece no desktop. */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="sm:hidden"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal /> Filtros
          {secondaryFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 px-1.5">
              {secondaryFiltersCount}
            </Badge>
          )}
        </Button>
      </div>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2",
          !filtersOpen && "hidden sm:flex",
        )}
      >
        {/* Ordenação (não é filtro — não entra na contagem do badge nem no
         * "Limpar"). `date` é competência/vencimento: "Mais antigas" + status
         * pendente traz à tona as parcelas atrasadas primeiro. */}
        <Select
          value={sort}
          onValueChange={(v) => onSortChange(v as EntrySort)}
        >
          <SelectTrigger size="sm" className="w-full sm:w-auto sm:min-w-40">
            <ArrowDownUp className="size-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTRY_SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FilterSelect
          value={filters.type}
          onValueChange={(v) => set("type", v as EntryFilters["type"])}
          placeholder="Todos os tipos"
        >
          <SelectItem value="expense">Despesas</SelectItem>
          <SelectItem value="income">Receitas</SelectItem>
          <SelectItem value="transfer">Transferências</SelectItem>
        </FilterSelect>
        <FilterSelect
          value={filters.status}
          onValueChange={(v) => set("status", v as EntryFilters["status"])}
          placeholder="Todos os status"
        >
          <SelectItem value="paid">Pagos</SelectItem>
          <SelectItem value="pending">Pendentes</SelectItem>
          <SelectItem value="cancelled">Cancelados</SelectItem>
        </FilterSelect>
        <FilterSelect
          value={filters.accountId}
          onValueChange={(v) => set("accountId", v)}
          placeholder="Todas as contas"
        >
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.name}
            </SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect
          value={filters.categoryId}
          onValueChange={(v) => set("categoryId", v)}
          placeholder="Todas as categorias"
        >
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </FilterSelect>
        {/* Filtro por membro — só renderiza para o admin de uma casa (Fase 16). */}
        {memberOptions.length > 0 && (
          <FilterSelect
            value={filters.userId}
            onValueChange={(v) => set("userId", v)}
            placeholder="Todos os membros"
          >
            {memberOptions.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
          </FilterSelect>
        )}
        <div className="flex items-center gap-2">
          <DatePicker
            value={filters.from ?? ""}
            onValueChange={(v) => set("from", v || undefined)}
            placeholder="De"
            className="h-8 w-auto"
          />
          <DatePicker
            value={filters.to ?? ""}
            onValueChange={(v) => set("to", v || undefined)}
            placeholder="Até"
            className="h-8 w-auto"
          />
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFiltersChange({})}
            className="text-muted-foreground"
          >
            <X /> Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
