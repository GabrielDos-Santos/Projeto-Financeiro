"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { todayISO } from "@/lib/dates";
import { applyFieldErrors } from "@/lib/form";
import { createLoan } from "../actions";
import { loanFormSchema, type LoanFormInput } from "../schemas";
import { InstallmentPreviewTable } from "@/features/transactions/components/installment-preview-table";
import type {
  AccountOption,
  CategoryOption,
} from "@/features/transactions/types";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/shared/date-picker";
import { DomainIcon } from "@/components/shared/domain-icon";
import { MoneyInput } from "@/components/shared/money-input";

const DEFAULT_VALUES: LoanFormInput = {
  name: "",
  lender: "",
  principalCents: 0,
  totalCents: 0,
  installmentsTotal: 2,
  interestRate: undefined,
  contractDate: todayISO(),
  firstDueDate: todayISO(),
  paidCount: 0,
  installmentAccountId: "",
  expenseCategoryId: "",
  creditToAccount: false,
  disbursementAccountId: undefined,
  disbursementCategoryId: undefined,
  notes: "",
};

export function LoanFormDialog({
  accounts,
  categories,
  open,
  onOpenChange,
  children,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isOpen = open ?? uncontrolledOpen;
  const setIsOpen = onOpenChange ?? setUncontrolledOpen;
  const [isPending, startTransition] = React.useTransition();

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  const form = useForm<LoanFormInput>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {
      ...DEFAULT_VALUES,
      installmentAccountId: accounts[0]?.id ?? "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({ ...DEFAULT_VALUES, installmentAccountId: accounts[0]?.id ?? "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const watchedTotal = form.watch("totalCents");
  const watchedCount = form.watch("installmentsTotal");
  const watchedFirstDueDate = form.watch("firstDueDate");
  const watchedPaidCount = form.watch("paidCount");
  const watchedCreditToAccount = form.watch("creditToAccount");

  function onSubmit(values: LoanFormInput) {
    startTransition(async () => {
      const result = await createLoan(values);
      if (!result.ok) {
        applyFieldErrors(form, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(`Empréstimo "${values.name}" cadastrado.`);
      setIsOpen(false);
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="overflow-y-auto sm:max-h-[90vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo empréstimo</DialogTitle>
          <DialogDescription>
            As parcelas viram despesa no mês do vencimento; o valor recebido
            (se houver) entra como receita separada do relatório de renda.
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: Empréstimo reforma" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instituição (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: Banco X, FGTS, pessoa física…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="principalCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor recebido (principal)</FormLabel>
                    <FormControl>
                      <MoneyInput value={field.value} onValueChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total a pagar (com juros)</FormLabel>
                    <FormControl>
                      <MoneyInput value={field.value} onValueChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="contractDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da contratação</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onValueChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="interestRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxa a.m. % (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        placeholder="Ex.: 1,99"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? undefined : Number(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="expenseCategoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria das parcelas</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Escolha a categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {expenseCategories.map((category) => (
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

            <FormField
              control={form.control}
              name="installmentAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conta que paga as parcelas</FormLabel>
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

            <InstallmentPreviewTable
              totalCents={watchedTotal}
              count={watchedCount}
              firstDueDate={watchedFirstDueDate}
              paidCount={watchedPaidCount}
            />

            <FormField
              control={form.control}
              name="creditToAccount"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-md border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="font-normal">
                      O valor recebido caiu numa conta
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Registra o principal como receita — não conta como renda
                      nos relatórios, só credita a conta.
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {watchedCreditToAccount && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="disbursementAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conta que recebeu</FormLabel>
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
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
                  name="disbursementCategoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria da receita</FormLabel>
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Escolha a categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {incomeCategories.map((category) => (
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

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                Cadastrar empréstimo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
