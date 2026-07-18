"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { todayISO } from "@/lib/dates";
import { applyFieldErrors } from "@/lib/form";
import { computeInvoicePeriod } from "@/services/invoices";
import {
  createCardInstallmentBackfillPurchase,
  createInstallmentBackfillPurchase,
} from "@/features/transactions/actions";
import {
  installmentBackfillAccountSchema,
  installmentBackfillCardSchema,
  type InstallmentBackfillAccountInput,
  type InstallmentBackfillCardInput,
} from "@/features/transactions/schemas";
import { InstallmentPreviewTable } from "@/features/transactions/components/installment-preview-table";
import type {
  AccountOption,
  CardOption,
  CategoryOption,
} from "@/features/transactions/types";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/shared/date-picker";
import { DomainIcon } from "@/components/shared/domain-icon";
import { MoneyInput } from "@/components/shared/money-input";

type Mode = "account" | "card";

type InstallmentBackfillFormProps = {
  accounts: AccountOption[];
  cards: CardOption[];
  categories: CategoryOption[];
  onDone: () => void;
};

export function InstallmentBackfillForm({
  accounts,
  cards,
  categories,
  onDone,
}: InstallmentBackfillFormProps) {
  const [mode, setMode] = React.useState<Mode>("account");
  const expenseCategories = categories.filter((c) => c.type === "expense");

  return (
    <div className="grid gap-4">
      {cards.length > 0 && (
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList className="w-full">
            <TabsTrigger value="account">Em conta</TabsTrigger>
            <TabsTrigger value="card">No cartão</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
      <p className="text-muted-foreground text-xs">
        Reconstrua uma compra parcelada que já está em andamento: as parcelas
        já pagas nascem históricas (não afetam o saldo atual) e as futuras
        continuam normais.
      </p>
      {mode === "account" ? (
        <AccountBackfillForm
          accounts={accounts}
          categories={expenseCategories}
          onDone={onDone}
        />
      ) : (
        <CardBackfillForm
          cards={cards}
          accounts={accounts}
          categories={expenseCategories}
          onDone={onDone}
        />
      )}
    </div>
  );
}

function AccountBackfillForm({
  accounts,
  categories,
  onDone,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  onDone: () => void;
}) {
  const [isPending, startTransition] = React.useTransition();
  const form = useForm<InstallmentBackfillAccountInput>({
    resolver: zodResolver(installmentBackfillAccountSchema),
    defaultValues: {
      description: "",
      amountCents: 0,
      installmentsTotal: 2,
      date: todayISO(),
      firstDueDate: todayISO(),
      paidCount: 0,
      accountId: accounts[0]?.id ?? "",
      categoryId: "",
      notes: "",
    },
  });

  const watchedAmount = form.watch("amountCents");
  const watchedCount = form.watch("installmentsTotal");
  const watchedFirstDueDate = form.watch("firstDueDate");
  const watchedPaidCount = form.watch("paidCount");

  function onSubmit(values: InstallmentBackfillAccountInput) {
    startTransition(async () => {
      const result = await createInstallmentBackfillPurchase(values);
      if (!result.ok) {
        applyFieldErrors(form, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(
        `Compra em ${values.installmentsTotal}x reconstruída (${values.paidCount} já paga(s)).`,
      );
      onDone();
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Input placeholder="Ex.: Geladeira" {...field} />
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
                <FormLabel>Valor total</FormLabel>
                <FormControl>
                  <MoneyInput value={field.value} onValueChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data da compra</FormLabel>
                <FormControl>
                  <DatePicker value={field.value} onValueChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="accountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Conta</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
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
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Escolha a categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <DomainIcon name={category.icon} className="size-4" />
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
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="installmentsTotal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total de parcelas</FormLabel>
                <Select
                  value={String(field.value)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Array.from({ length: 119 }, (_, i) => i + 2).map((count) => (
                      <SelectItem key={count} value={String(count)}>
                        {count}x
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="firstDueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vencimento da 1ª parcela</FormLabel>
                <FormControl>
                  <DatePicker value={field.value} onValueChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paidCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parcelas já pagas</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={watchedCount}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <InstallmentPreviewTable
          totalCents={watchedAmount}
          count={watchedCount}
          firstDueDate={watchedFirstDueDate}
          paidCount={watchedPaidCount}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações (opcional)</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : null}
          Reconstruir compra
        </Button>
      </form>
    </Form>
  );
}

function CardBackfillForm({
  cards,
  accounts,
  categories,
  onDone,
}: {
  cards: CardOption[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  onDone: () => void;
}) {
  const [isPending, startTransition] = React.useTransition();
  const form = useForm<InstallmentBackfillCardInput>({
    resolver: zodResolver(installmentBackfillCardSchema),
    defaultValues: {
      description: "",
      amountCents: 0,
      installmentsTotal: 2,
      date: todayISO(),
      paidCount: 0,
      creditCardId: cards[0]?.id ?? "",
      categoryId: "",
      settlementAccountId: accounts[0]?.id,
      notes: "",
    },
  });

  const watchedAmount = form.watch("amountCents");
  const watchedCount = form.watch("installmentsTotal");
  const watchedDate = form.watch("date");
  const watchedCardId = form.watch("creditCardId");
  const watchedPaidCount = form.watch("paidCount");
  const selectedCard = cards.find((c) => c.id === watchedCardId);
  const firstDueDate =
    selectedCard && watchedDate
      ? computeInvoicePeriod(
          selectedCard.closingDay,
          selectedCard.dueDay,
          watchedDate,
        ).dueDate
      : "";

  function onSubmit(values: InstallmentBackfillCardInput) {
    startTransition(async () => {
      const result = await createCardInstallmentBackfillPurchase(values);
      if (!result.ok) {
        applyFieldErrors(form, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(
        `Compra em ${values.installmentsTotal}x reconstruída no cartão` +
          (result.data.invoicesSettled > 0
            ? ` — ${result.data.invoicesSettled} fatura(s) passada(s) fechada(s) como paga(s).`
            : "."),
      );
      onDone();
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Input placeholder="Ex.: Notebook" {...field} />
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
                <FormLabel>Valor total</FormLabel>
                <FormControl>
                  <MoneyInput value={field.value} onValueChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data da compra</FormLabel>
                <FormControl>
                  <DatePicker value={field.value} onValueChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="creditCardId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cartão</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
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
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Escolha a categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <DomainIcon name={category.icon} className="size-4" />
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
            name="installmentsTotal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total de parcelas</FormLabel>
                <Select
                  value={String(field.value)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Array.from({ length: 119 }, (_, i) => i + 2).map((count) => (
                      <SelectItem key={count} value={String(count)}>
                        {count}x
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paidCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parcelas já pagas</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={watchedCount}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {watchedPaidCount > 0 && (
          <FormField
            control={form.control}
            name="settlementAccountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Conta usada para pagar as faturas passadas</FormLabel>
                <Select
                  value={field.value ?? ""}
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
                <p className="text-muted-foreground text-xs">
                  As faturas das {watchedPaidCount} parcela(s) já paga(s) são
                  fechadas como pagas (histórico) — não afetam o saldo desta
                  conta.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {firstDueDate && (
          <InstallmentPreviewTable
            totalCents={watchedAmount}
            count={watchedCount}
            firstDueDate={firstDueDate}
            paidCount={watchedPaidCount}
          />
        )}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações (opcional)</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : null}
          Reconstruir compra
        </Button>
      </form>
    </Form>
  );
}
