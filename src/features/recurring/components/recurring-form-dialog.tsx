"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { todayISO } from "@/lib/dates";
import { applyFieldErrors } from "@/lib/form";
import type { Frequency } from "@/services/recurrence";
import type {
  AccountOption,
  CardOption,
  CategoryOption,
} from "@/features/transactions/types";
import { createRecurring, updateRecurring } from "../actions";
import { recurringFormSchema, type RecurringFormInput } from "../schemas";
import type { Recurring } from "../types";
import { NextOccurrencesPreview } from "./next-occurrences-preview";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/shared/date-picker";
import { DomainIcon } from "@/components/shared/domain-icon";
import { MoneyInput } from "@/components/shared/money-input";

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Dia(s)" },
  { value: "weekly", label: "Semana(s)" },
  { value: "monthly", label: "Mês(es)" },
  { value: "yearly", label: "Ano(s)" },
];

function defaults(): RecurringFormInput {
  return {
    description: "",
    amountCents: 0,
    type: "expense",
    categoryId: "",
    ownerKind: "account",
    accountId: "",
    creditCardId: "",
    frequency: "monthly",
    intervalCount: 1,
    startDate: todayISO(),
    endDate: null,
  };
}

type RecurringFormDialogProps = {
  recurring?: Recurring;
  accounts: AccountOption[];
  categories: CategoryOption[];
  cards: CardOption[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
};

export function RecurringFormDialog({
  recurring,
  accounts,
  categories,
  cards,
  open: controlledOpen,
  onOpenChange,
  children,
}: RecurringFormDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const [isPending, startTransition] = React.useTransition();
  const isEditing = Boolean(recurring);

  const form = useForm<RecurringFormInput>({
    resolver: zodResolver(recurringFormSchema),
    defaultValues: defaults(),
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset(
      recurring
        ? {
            description: recurring.description,
            amountCents: recurring.amount_cents,
            type: recurring.type === "income" ? "income" : "expense",
            categoryId: recurring.category_id,
            ownerKind: recurring.credit_card_id ? "card" : "account",
            accountId: recurring.account_id ?? "",
            creditCardId: recurring.credit_card_id ?? "",
            frequency: recurring.frequency,
            intervalCount: recurring.interval_count,
            startDate: recurring.start_date,
            endDate: recurring.end_date,
          }
        : defaults(),
    );
  }, [open, recurring, form]);

  const type = form.watch("type");
  const ownerKind = form.watch("ownerKind");
  const typeCategories = categories.filter((c) => c.type === type);
  const canUseCard = type === "expense" && cards.length > 0;

  // Receita não usa cartão; se trocar para receita, volta para conta.
  React.useEffect(() => {
    if (type === "income" && form.getValues("ownerKind") === "card") {
      form.setValue("ownerKind", "account");
    }
    const categoryId = form.getValues("categoryId");
    if (
      categoryId &&
      !categories.some((c) => c.id === categoryId && c.type === type)
    ) {
      form.setValue("categoryId", "");
    }
  }, [type, categories, form]);

  function onSubmit(values: RecurringFormInput) {
    startTransition(async () => {
      const result = isEditing
        ? await updateRecurring(recurring!.id, values)
        : await createRecurring(values);
      if (!result.ok) {
        applyFieldErrors(form, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(
        isEditing ? "Recorrência atualizada." : "Recorrência criada.",
      );
      setOpen(false);
    });
  }

  const [startDate, frequency, intervalCount, endDate] = form.watch([
    "startDate",
    "frequency",
    "intervalCount",
    "endDate",
  ]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar recorrência" : "Nova recorrência"}
          </DialogTitle>
          <DialogDescription>
            Um template gera lançamentos pendentes automaticamente (às 3h, todo
            dia). Ex.: aluguel, faculdade, assinaturas, salário.
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
              name="type"
              render={({ field }) => (
                <FormItem>
                  <Tabs value={field.value} onValueChange={field.onChange}>
                    <TabsList className="w-full">
                      <TabsTrigger value="expense">Despesa</TabsTrigger>
                      <TabsTrigger value="income">Receita</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: Aluguel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="amountCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor</FormLabel>
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
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {typeCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <DomainIcon
                              name={category.icon}
                              className="size-4"
                            />
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="ownerKind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fonte</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="account">Conta</SelectItem>
                        {canUseCard && (
                          <SelectItem value="card">Cartão</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {ownerKind === "card" ? (
                <FormField
                  control={form.control}
                  name="creditCardId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cartão</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Escolha o cartão" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {cards.map((card) => (
                            <SelectItem key={card.id} value={card.id}>
                              {card.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conta</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Escolha a conta" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr]">
              <FormField
                control={form.control}
                name="intervalCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>A cada</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={String(field.value)}
                        onChange={(e) => {
                          const n = Number.parseInt(
                            e.target.value.replace(/\D/g, ""),
                            10,
                          );
                          field.onChange(Number.isNaN(n) ? 0 : n);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequência</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <DatePicker
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
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fim (opcional)</FormLabel>
                    <div className="flex items-center gap-1">
                      <FormControl>
                        <DatePicker
                          value={field.value ?? ""}
                          onValueChange={field.onChange}
                          placeholder="Sem fim"
                        />
                      </FormControl>
                      {field.value && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground"
                          aria-label="Remover data de fim"
                          onClick={() => field.onChange(null)}
                        >
                          <X />
                        </Button>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {startDate && intervalCount >= 1 && (
              <NextOccurrencesPreview
                startDate={startDate}
                frequency={frequency}
                intervalCount={intervalCount}
                endDate={endDate ?? null}
              />
            )}

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
                {isEditing ? "Salvar" : "Criar recorrência"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
