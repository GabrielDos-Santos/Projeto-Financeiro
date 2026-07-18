"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { applyFieldErrors } from "@/lib/form";
import type { CategoryOption } from "@/features/transactions/types";
import { createBudget, updateBudget } from "../actions";
import { budgetFormSchema, type BudgetFormInput } from "../schemas";
import type { BudgetUsage } from "../types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DomainIcon } from "@/components/shared/domain-icon";
import { MoneyInput } from "@/components/shared/money-input";

type BudgetFormDialogProps = {
  /** Presente = editar (categoria/mês travados); ausente = criar. */
  budget?: BudgetUsage;
  /** Mês pré-selecionado ao criar (o mês em que a tela está). */
  month: string;
  /** Categorias de despesa sem orçamento neste mês (evita 23505 na origem). */
  availableCategories: CategoryOption[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
};

export function BudgetFormDialog({
  budget,
  month,
  availableCategories,
  open: controlledOpen,
  onOpenChange,
  children,
}: BudgetFormDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const [isPending, startTransition] = React.useTransition();
  const isEditing = Boolean(budget);

  const form = useForm<BudgetFormInput>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      categoryId: "",
      month,
      amountCents: 0,
      alertThreshold: 0.8,
    },
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset(
      budget
        ? {
            categoryId: budget.category_id ?? "",
            month: budget.month ?? month,
            amountCents: budget.amount_cents ?? 0,
            alertThreshold: budget.alert_threshold ?? 0.8,
          }
        : {
            categoryId: "",
            month,
            amountCents: 0,
            alertThreshold: 0.8,
          },
    );
  }, [open, budget, month, form]);

  function onSubmit(values: BudgetFormInput) {
    startTransition(async () => {
      const result = isEditing
        ? await updateBudget(budget!.budget_id, values)
        : await createBudget(values);
      if (!result.ok) {
        applyFieldErrors(form, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(isEditing ? "Orçamento atualizado." : "Orçamento criado.");
      setOpen(false);
    });
  }

  const alertPct = Math.round(form.watch("alertThreshold") * 100);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar orçamento" : "Novo orçamento"}
          </DialogTitle>
          <DialogDescription>
            Um teto mensal por categoria de despesa. Você é avisado ao cruzar o
            percentual de alerta.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Escolha a categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isEditing && budget ? (
                        <SelectItem value={budget.category_id ?? ""}>
                          {budget.category_name}
                        </SelectItem>
                      ) : (
                        availableCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <DomainIcon
                              name={category.icon}
                              className="size-4"
                            />
                            {category.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {isEditing && (
                    <FormDescription>
                      A categoria não muda após a criação.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amountCents"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teto do mês</FormLabel>
                  <FormControl>
                    <MoneyInput
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="alertThreshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alertar ao atingir {alertPct}%</FormLabel>
                  <FormControl>
                    <input
                      type="range"
                      min={5}
                      max={100}
                      step={5}
                      value={alertPct}
                      onChange={(e) =>
                        field.onChange(Number(e.target.value) / 100)
                      }
                      className="w-full accent-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" /> : null}
                {isEditing ? "Salvar" : "Criar orçamento"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
