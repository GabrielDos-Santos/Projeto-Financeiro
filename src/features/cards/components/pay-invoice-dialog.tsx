"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { History } from "lucide-react";

import { todayISO } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { applyFieldErrors } from "@/lib/form";
import type {
  AccountOption,
  CategoryOption,
} from "@/features/transactions/types";
import { payInvoice } from "../actions";
import { payInvoiceSchema, type PayInvoiceInput } from "../schemas";
import type { InvoiceTotals } from "../types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
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
import { DatePicker } from "@/components/shared/date-picker";
import { DomainIcon } from "@/components/shared/domain-icon";

export function PayInvoiceDialog({
  invoice,
  accounts,
  categories,
  open,
  onOpenChange,
}: {
  invoice: InvoiceTotals;
  accounts: AccountOption[];
  categories: CategoryOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isPending, startTransition] = React.useTransition();
  const expenseCategories = categories.filter((c) => c.type === "expense");

  const form = useForm<PayInvoiceInput>({
    resolver: zodResolver(payInvoiceSchema),
    defaultValues: {
      invoiceId: invoice.invoice_id ?? "",
      accountId: accounts[0]?.id ?? "",
      categoryId: "",
      date: todayISO(),
      affectsBalance: true,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        invoiceId: invoice.invoice_id ?? "",
        accountId: accounts[0]?.id ?? "",
        categoryId: "",
        date: todayISO(),
        affectsBalance: true,
      });
    }
  }, [open, invoice.invoice_id, accounts, form]);

  // Hint (decisão 57): fatura de mês passado é candidata a já estar
  // refletida no saldo inicial da conta — sugere marcar "pagamento histórico".
  const currentMonthISO = `${todayISO().slice(0, 7)}-01`;
  const isPastMonth = Boolean(
    invoice.reference_month && invoice.reference_month < currentMonthISO,
  );

  function onSubmit(values: PayInvoiceInput) {
    startTransition(async () => {
      const result = await payInvoice(values);
      if (!result.ok) {
        applyFieldErrors(form, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success("Fatura paga.");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagar fatura</DialogTitle>
          <DialogDescription>
            Total de {formatCents(invoice.total_cents ?? 0)}. Uma despesa será
            criada na conta escolhida e a fatura será quitada.
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
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conta de pagamento</FormLabel>
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
            <div className="grid gap-4 sm:grid-cols-2">
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
                        {expenseCategories.map((category) => (
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
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data do pagamento</FormLabel>
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
            </div>
            <p className="text-muted-foreground text-xs">
              A despesa de pagamento debita o saldo da conta, mas não conta de
              novo nos relatórios — as compras já contam por competência.
            </p>
            <FormField
              control={form.control}
              name="affectsBalance"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-2">
                  <FormControl>
                    <Checkbox
                      checked={!field.value}
                      onCheckedChange={(checked) => field.onChange(!checked)}
                    />
                  </FormControl>
                  <div className="space-y-0.5 leading-none">
                    <FormLabel className="flex items-center gap-1.5 font-normal">
                      <History className="size-3.5" aria-hidden />
                      Pagamento histórico
                    </FormLabel>
                    <p className="text-muted-foreground text-xs">
                      Não afeta o saldo atual — use se esta fatura já estava
                      refletida no saldo inicial da conta.
                      {isPastMonth &&
                        " Esta fatura é de um mês passado: talvez seja o seu caso."}
                    </p>
                  </div>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" /> : null}
                Pagar {formatCents(invoice.total_cents ?? 0)}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
