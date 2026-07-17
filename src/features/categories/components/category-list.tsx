"use client";

import * as React from "react";
import {
  Archive,
  ArchiveRestore,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { deleteCategory, setCategoryArchived } from "../actions";
import { CATEGORY_TYPE_LABELS, type Category } from "../types";
import { CategoryFormDialog } from "./category-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DomainIcon } from "@/components/shared/domain-icon";
import { cn } from "@/lib/utils";

function CategoryRow({ category }: { category: Category }) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const color = category.color ?? "#71717a";

  function handleArchiveToggle() {
    startTransition(async () => {
      const result = await setCategoryArchived(
        category.id,
        !category.is_archived,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        category.is_archived ? "Categoria reativada." : "Categoria arquivada.",
      );
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if (!result.ok) {
        toast.error(result.error);
        setDeleteOpen(false);
        return;
      }
      toast.success("Categoria excluída.");
      setDeleteOpen(false);
    });
  }

  return (
    <li
      className={cn(
        "flex items-center gap-3 py-2",
        category.is_archived && "opacity-60",
      )}
    >
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}1f`, color }}
      >
        <DomainIcon name={category.icon} className="size-4" />
      </div>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {category.name}
      </span>
      {category.is_archived && <Badge variant="outline">Arquivada</Badge>}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            aria-label={`Ações da categoria ${category.name}`}
          >
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleArchiveToggle} disabled={isPending}>
            {category.is_archived ? (
              <>
                <ArchiveRestore /> Reativar
              </>
            ) : (
              <>
                <Archive /> Arquivar
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CategoryFormDialog
        category={category}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir categoria"
        description={`A categoria "${category.name}" será excluída de forma permanente. Categorias em uso por lançamentos não podem ser excluídas — nesse caso, arquive.`}
        confirmLabel="Excluir"
        destructive
        isPending={isPending}
        onConfirm={handleDelete}
      />
    </li>
  );
}

function CategoryColumn({
  type,
  categories,
}: {
  type: Category["type"];
  categories: Category[];
}) {
  const label = CATEGORY_TYPE_LABELS[type];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{label}s</CardTitle>
        <CardDescription>
          {categories.length === 0
            ? `Nenhuma categoria de ${label.toLowerCase()}.`
            : `${categories.length} categoria(s)`}
        </CardDescription>
        <CardAction>
          <CategoryFormDialog defaultType={type}>
            <Button variant="outline" size="sm">
              <Plus /> Nova
            </Button>
          </CategoryFormDialog>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {categories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/** Duas colunas — despesas e receitas — com CRUD por linha. */
export function CategoryList({ categories }: { categories: Category[] }) {
  const expenses = categories.filter((c) => c.type === "expense");
  const incomes = categories.filter((c) => c.type === "income");

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <CategoryColumn type="expense" categories={expenses} />
      <CategoryColumn type="income" categories={incomes} />
    </div>
  );
}
