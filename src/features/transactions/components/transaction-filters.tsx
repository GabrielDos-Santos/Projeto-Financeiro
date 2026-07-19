"use client";

import * as React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { EntryFilters } from "../queries";
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
  accounts,
  categories,
}: {
  filters: EntryFilters;
  onFiltersChange: (filters: EntryFilters) => void;
  accounts: AccountOption[];
  categories: CategoryOption[];
}) {
  const hasFilters = Object.values(filters).some(Boolean);
  // Só os filtros "secundários" (o campo de busca fica sempre visível) —
  // conta quantos estão ativos pro badge do botão "Filtros" no mobile.
  const secondaryFiltersCount = [
    filters.type,
    filters.status,
    filters.accountId,
    filters.categoryId,
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
