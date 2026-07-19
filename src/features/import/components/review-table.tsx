"use client";

import { AlertTriangle } from "lucide-react";

import { formatDateBR } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CategoryOption } from "@/features/transactions/types";
import type { ReviewRow } from "../types";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { DomainIcon } from "@/components/shared/domain-icon";

type ReviewTableProps = {
  rows: ReviewRow[];
  onChange: (rows: ReviewRow[]) => void;
  categories: CategoryOption[];
  /** Conta: tipo e "afeta saldo" são editáveis por linha. Cartão: sempre despesa. */
  mode: "account" | "card";
};

function updateRow(
  rows: ReviewRow[],
  key: string,
  patch: Partial<ReviewRow>,
): ReviewRow[] {
  return rows.map((row) => (row.key === key ? { ...row, ...patch } : row));
}

export function ReviewTable({
  rows,
  onChange,
  categories,
  mode,
}: ReviewTableProps) {
  const allIncluded = rows.every((r) => r.include);

  return (
    <div className="h-full overflow-auto rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allIncluded}
                onCheckedChange={(checked) =>
                  onChange(
                    rows.map((r) => ({ ...r, include: Boolean(checked) })),
                  )
                }
                aria-label="Selecionar todas"
              />
            </TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="min-w-40">Categoria</TableHead>
            {mode === "account" && <TableHead className="w-24">Tipo</TableHead>}
            <TableHead className="w-28">Status</TableHead>
            {mode === "account" && (
              <TableHead className="w-28">Afeta saldo</TableHead>
            )}
            <TableHead className="sticky right-0 z-20 border-l bg-background text-right">
              Valor
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.key}
              className={cn(!row.include && "opacity-50")}
            >
              <TableCell>
                <Checkbox
                  checked={row.include}
                  onCheckedChange={(checked) =>
                    onChange(
                      updateRow(rows, row.key, { include: Boolean(checked) }),
                    )
                  }
                  aria-label={`Incluir linha ${row.description}`}
                />
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                {formatDateBR(row.dateISO)}
              </TableCell>
              <TableCell className="min-w-md">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{row.description}</span>
                  {row.isDuplicate && (
                    <Badge
                      variant="outline"
                      className="shrink-0 gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400"
                    >
                      <AlertTriangle className="size-3" />
                      Duplicata?
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Select
                  value={row.categoryId}
                  onValueChange={(value) =>
                    onChange(updateRow(rows, row.key, { categoryId: value }))
                  }
                >
                  <SelectTrigger className="h-8 w-full">
                    <SelectValue placeholder="Escolha" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter((c) => c.type === row.type)
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <DomainIcon
                            name={category.icon}
                            className="size-3.5"
                          />
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </TableCell>
              {mode === "account" && (
                <TableCell>
                  <Select
                    value={row.type}
                    onValueChange={(value) =>
                      onChange(
                        updateRow(rows, row.key, {
                          type: value as "income" | "expense",
                          categoryId: "",
                        }),
                      )
                    }
                  >
                    <SelectTrigger className="h-8 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Despesa</SelectItem>
                      <SelectItem value="income">Receita</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              )}
              <TableCell>
                <Select
                  value={row.status}
                  onValueChange={(value) =>
                    onChange(
                      updateRow(rows, row.key, {
                        status: value as "paid" | "pending",
                      }),
                    )
                  }
                >
                  <SelectTrigger className="h-8 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              {mode === "account" && (
                <TableCell>
                  <Checkbox
                    checked={row.affectsBalance}
                    onCheckedChange={(checked) =>
                      onChange(
                        updateRow(rows, row.key, {
                          affectsBalance: Boolean(checked),
                        }),
                      )
                    }
                    aria-label="Afeta o saldo"
                  />
                </TableCell>
              )}
              <TableCell className="sticky right-0 z-10 border-l bg-background text-right text-sm tabular-nums">
                {formatCents(row.amountCents)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
