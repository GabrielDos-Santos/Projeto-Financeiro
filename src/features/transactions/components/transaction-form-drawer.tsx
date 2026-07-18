"use client";

import * as React from "react";
import { useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, History, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { createClient } from "@/lib/supabase/client";
import { todayISO } from "@/lib/dates";
import { applyFieldErrors } from "@/lib/form";
import { computeInvoicePeriod } from "@/services/invoices";
import {
  createCardInstallmentPurchase,
  createCardPurchase,
  createInstallmentPurchase,
  createTransaction,
  createTransfer,
  updateTransaction,
  updateTransfer,
} from "../actions";
import {
  cardInstallmentPurchaseSchema,
  cardPurchaseSchema,
  entryFormSchema,
  transferFormSchema,
  type CardInstallmentPurchaseInput,
  type CardPurchaseInput,
  type EntryFormInput,
  type TransferFormInput,
} from "../schemas";
import type {
  AccountOption,
  CardOption,
  CategoryOption,
  Entry,
} from "../types";
import { AttachmentsList } from "./attachments-list";
import { InstallmentPreviewTable } from "./installment-preview-table";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/shared/date-picker";
import { DomainIcon } from "@/components/shared/domain-icon";
import { MoneyInput } from "@/components/shared/money-input";
import type { BudgetAlert } from "@/features/budgets/types";

type FormKind = "expense" | "income" | "card" | "transfer";

/** Toast extra quando a despesa cruza o teto do orçamento da categoria. */
function showBudgetAlertToast(alert: BudgetAlert | null | undefined) {
  if (!alert) return;
  toast.warning(
    `Orçamento de ${alert.categoryName} atingiu ${alert.usagePct}% do teto.`,
  );
}

/**
 * Seção "Avançado" com o checkbox de lançamento histórico (Fase 17, decisão
 * 56). O CAMPO do formulário é `affectsBalance` (mesmo nome/semântica do
 * banco — fonte única entre client e Server Action), mas a CAIXA exibida é a
 * inversa ("Lançamento histórico") — checked = affectsBalance=false. Default
 * fechado e desmarcado: não atrapalha o uso do dia a dia.
 */
function AdvancedHistoricalField<T extends { affectsBalance: boolean }>({
  control,
}: {
  control: Control<T>;
}) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="text-muted-foreground flex items-center gap-1 text-xs font-medium hover:underline">
        <ChevronDown className="size-3.5" aria-hidden />
        Avançado
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <FormField
          control={control}
          name={"affectsBalance" as never}
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
                  Lançamento histórico
                </FormLabel>
                <p className="text-muted-foreground text-xs">
                  Não afeta o saldo atual — use para dinheiro que já estava
                  refletido no saldo inicial da conta.
                </p>
              </div>
            </FormItem>
          )}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

type TransactionFormDrawerProps = {
  accounts: AccountOption[];
  categories: CategoryOption[];
  cards: CardOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Presente = editar (ou duplicar, se `duplicate`); ausente = criar. */
  entry?: Entry;
  duplicate?: boolean;
};

export function TransactionFormDrawer({
  accounts,
  categories,
  cards,
  open,
  onOpenChange,
  entry,
  duplicate = false,
}: TransactionFormDrawerProps) {
  const isEditing = Boolean(entry) && !duplicate;
  const initialKind: FormKind =
    entry?.type === "transfer"
      ? "transfer"
      : entry?.type === "income"
        ? "income"
        : "expense";
  const [kind, setKind] = React.useState<FormKind>(initialKind);

  React.useEffect(() => {
    if (open) setKind(initialKind);
  }, [open, initialKind]);

  const title = isEditing
    ? entry?.type === "transfer"
      ? "Editar transferência"
      : "Editar lançamento"
    : "Novo lançamento";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {kind === "transfer"
              ? "A transferência gera um par espelhado: saída na origem e entrada no destino."
              : kind === "card"
                ? "Compra no cartão entra na fatura da competência — o saldo só muda ao pagar a fatura."
                : "Lançamentos pagos movem o saldo da conta; pendentes ficam previstos."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-4">
          {!isEditing && (
            <Tabs value={kind} onValueChange={(v) => setKind(v as FormKind)}>
              <TabsList className="w-full">
                <TabsTrigger value="expense">Despesa</TabsTrigger>
                <TabsTrigger value="income">Receita</TabsTrigger>
                {cards.length > 0 && (
                  <TabsTrigger value="card">Cartão</TabsTrigger>
                )}
                <TabsTrigger value="transfer">Transferência</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          {kind === "transfer" ? (
            <TransferForm
              accounts={accounts}
              entry={entry}
              duplicate={duplicate}
              onDone={() => onOpenChange(false)}
            />
          ) : kind === "card" ? (
            <CardPurchaseForm
              cards={cards}
              categories={categories}
              onDone={() => onOpenChange(false)}
            />
          ) : (
            <EntryForm
              type={kind === "income" ? "income" : "expense"}
              accounts={accounts}
              categories={categories}
              entry={entry}
              duplicate={duplicate}
              onDone={() => onOpenChange(false)}
            />
          )}
          {isEditing && entry?.transaction_id && (
            <>
              <Separator />
              <AttachmentsList transactionId={entry.transaction_id} />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatusSelectItem({ value }: { value: "paid" | "pending" }) {
  return (
    <SelectItem value={value}>
      {value === "paid" ? "Pago" : "Pendente"}
    </SelectItem>
  );
}

function EntryForm({
  type,
  accounts,
  categories,
  entry,
  duplicate,
  onDone,
}: {
  type: "expense" | "income";
  accounts: AccountOption[];
  categories: CategoryOption[];
  entry?: Entry;
  duplicate: boolean;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = React.useTransition();
  const isEditing = Boolean(entry) && !duplicate;
  const typeCategories = categories.filter((c) => c.type === type);

  // Parcelamento (D4): 1 = à vista; ≥ 2 vira compra-mãe + parcelas.
  // Só na criação de DESPESA — edição de compra parcelada fica fora do MVP.
  const [installmentsTotal, setInstallmentsTotal] = React.useState(1);
  const [firstDueDate, setFirstDueDate] = React.useState(todayISO());
  const canInstall = type === "expense" && !isEditing;
  const isInstallmentPurchase = canInstall && installmentsTotal > 1;

  const form = useForm<EntryFormInput>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: entry
      ? {
          type,
          description: entry.description ?? "",
          amountCents: entry.amount_cents ?? 0,
          date: duplicate ? todayISO() : (entry.date ?? todayISO()),
          status: entry.status === "paid" && !duplicate ? "paid" : "pending",
          notes: entry.notes ?? "",
          accountId: entry.account_id ?? "",
          categoryId: entry.category_id ?? "",
          affectsBalance: duplicate ? true : (entry.affects_balance ?? true),
        }
      : {
          type,
          description: "",
          amountCents: 0,
          date: todayISO(),
          status: "paid",
          notes: "",
          accountId: accounts[0]?.id ?? "",
          categoryId: "",
          affectsBalance: true,
        },
  });

  // Troca de aba (despesa ⇄ receita): sincroniza o tipo e limpa a categoria
  // se ela não pertencer ao novo tipo.
  React.useEffect(() => {
    form.setValue("type", type);
    const categoryId = form.getValues("categoryId");
    if (
      categoryId &&
      !categories.some((c) => c.id === categoryId && c.type === type)
    ) {
      form.setValue("categoryId", "");
    }
    if (type !== "expense") setInstallmentsTotal(1);
  }, [type, categories, form]);

  function onSubmit(values: EntryFormInput) {
    startTransition(async () => {
      const result = isInstallmentPurchase
        ? await createInstallmentPurchase({
            description: values.description,
            amountCents: values.amountCents,
            installmentsTotal,
            date: values.date,
            firstDueDate,
            accountId: values.accountId,
            categoryId: values.categoryId,
            notes: values.notes,
          })
        : isEditing
          ? await updateTransaction(entry!.transaction_id, values)
          : await createTransaction(values);

      if (!result.ok) {
        applyFieldErrors(form, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(
        isInstallmentPurchase
          ? `Compra em ${installmentsTotal}x criada.`
          : isEditing
            ? "Lançamento atualizado."
            : "Lançamento criado.",
      );
      showBudgetAlertToast(
        result.data && "alert" in result.data ? result.data.alert : null,
      );
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      onDone();
    });
  }

  const watchedAmount = form.watch("amountCents");

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
                <Input
                  placeholder={
                    type === "expense" ? "Ex.: Mercado do mês" : "Ex.: Salário"
                  }
                  {...field}
                />
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
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data</FormLabel>
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
                    {typeCategories.map((category) => (
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
        {canInstall && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Parcelamento</Label>
              <Select
                value={String(installmentsTotal)}
                onValueChange={(v) => {
                  const count = Number(v);
                  setInstallmentsTotal(count);
                  if (count > 1) setFirstDueDate(form.getValues("date"));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">À vista</SelectItem>
                  {Array.from({ length: 47 }, (_, i) => i + 2).map((count) => (
                    <SelectItem key={count} value={String(count)}>
                      {count}x
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isInstallmentPurchase && (
              <div className="space-y-2">
                <Label>Vencimento da 1ª parcela</Label>
                <DatePicker
                  value={firstDueDate}
                  onValueChange={setFirstDueDate}
                />
              </div>
            )}
          </div>
        )}
        {isInstallmentPurchase && (
          <>
            <InstallmentPreviewTable
              totalCents={watchedAmount}
              count={installmentsTotal}
              firstDueDate={firstDueDate}
            />
            <p className="text-xs text-muted-foreground">
              As parcelas nascem pendentes — marque cada uma como paga no
              vencimento. O saldo só é debitado por parcela paga.
            </p>
          </>
        )}
        {!isInstallmentPurchase && (
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <StatusSelectItem value="paid" />
                    <StatusSelectItem value="pending" />
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
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
        {!isInstallmentPurchase && (
          <AdvancedHistoricalField control={form.control} />
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : null}
          {isInstallmentPurchase
            ? `Criar compra em ${installmentsTotal}x`
            : isEditing
              ? "Salvar"
              : "Criar lançamento"}
        </Button>
      </form>
    </Form>
  );
}

function CardPurchaseForm({
  cards,
  categories,
  onDone,
}: {
  cards: CardOption[];
  categories: CategoryOption[];
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = React.useTransition();
  const [installmentsTotal, setInstallmentsTotal] = React.useState(1);
  const expenseCategories = categories.filter((c) => c.type === "expense");
  const isInstallment = installmentsTotal > 1;

  const form = useForm<CardPurchaseInput>({
    resolver: zodResolver(cardPurchaseSchema),
    defaultValues: {
      description: "",
      amountCents: 0,
      date: todayISO(),
      creditCardId: cards[0]?.id ?? "",
      categoryId: "",
      notes: "",
    },
  });

  const watchedAmount = form.watch("amountCents");
  const watchedDate = form.watch("date");
  const watchedCardId = form.watch("creditCardId");
  const selectedCard = cards.find((c) => c.id === watchedCardId);
  const firstDueDate =
    selectedCard && watchedDate
      ? computeInvoicePeriod(
          selectedCard.closingDay,
          selectedCard.dueDay,
          watchedDate,
        ).dueDate
      : "";

  function onSubmit(values: CardPurchaseInput) {
    startTransition(async () => {
      let result;
      if (isInstallment) {
        const payload: CardInstallmentPurchaseInput = {
          ...values,
          installmentsTotal,
        };
        const parsed = cardInstallmentPurchaseSchema.safeParse(payload);
        if (!parsed.success) {
          applyFieldErrors(form, z.flattenError(parsed.error).fieldErrors);
          toast.error("Revise os campos.");
          return;
        }
        result = await createCardInstallmentPurchase(parsed.data);
      } else {
        result = await createCardPurchase(values);
      }

      if (!result.ok) {
        applyFieldErrors(form, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(
        isInstallment
          ? `Compra em ${installmentsTotal}x lançada no cartão.`
          : "Compra lançada no cartão.",
      );
      showBudgetAlertToast(result.data.alert);
      queryClient.invalidateQueries({ queryKey: ["entries"] });
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
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data da compra</FormLabel>
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
        </div>
        <div className="space-y-2">
          <Label>Parcelamento</Label>
          <Select
            value={String(installmentsTotal)}
            onValueChange={(v) => setInstallmentsTotal(Number(v))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">À vista (1x)</SelectItem>
              {Array.from({ length: 47 }, (_, i) => i + 2).map((count) => (
                <SelectItem key={count} value={String(count)}>
                  {count}x
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isInstallment && firstDueDate && (
          <>
            <InstallmentPreviewTable
              totalCents={watchedAmount}
              count={installmentsTotal}
              firstDueDate={firstDueDate}
            />
            <p className="text-xs text-muted-foreground">
              Cada parcela cai na fatura do seu mês. O saldo só muda quando você
              paga cada fatura.
            </p>
          </>
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
          {isInstallment
            ? `Lançar compra em ${installmentsTotal}x`
            : "Lançar compra"}
        </Button>
      </form>
    </Form>
  );
}

function TransferForm({
  accounts,
  entry,
  duplicate,
  onDone,
}: {
  accounts: AccountOption[];
  entry?: Entry;
  duplicate: boolean;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = React.useTransition();
  const isEditing = Boolean(entry) && !duplicate;
  const groupId = entry?.transfer_group_id ?? null;

  // Uma linha de v_entries é só UMA perna: para editar/duplicar é preciso
  // carregar o par e descobrir origem (out) e destino (in).
  const pairQuery = useQuery({
    queryKey: ["transfer-pair", groupId],
    enabled: Boolean(groupId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("transactions")
        .select("account_id, transfer_direction")
        .eq("transfer_group_id", groupId!);
      if (error) throw new Error("Falha ao carregar a transferência.");
      return {
        fromAccountId:
          data.find((leg) => leg.transfer_direction === "out")?.account_id ??
          "",
        toAccountId:
          data.find((leg) => leg.transfer_direction === "in")?.account_id ?? "",
      };
    },
  });

  if (groupId && pairQuery.isPending) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  return (
    <TransferFormFields
      key={groupId ?? "new"}
      accounts={accounts}
      entry={entry}
      duplicate={duplicate}
      pair={pairQuery.data}
      onSubmitTransfer={(values, done) => {
        startTransition(async () => {
          const result = isEditing
            ? await updateTransfer(groupId, values)
            : await createTransfer(values);
          if (!result.ok) {
            done(result);
            return;
          }
          toast.success(
            isEditing ? "Transferência atualizada." : "Transferência criada.",
          );
          queryClient.invalidateQueries({ queryKey: ["entries"] });
          queryClient.invalidateQueries({ queryKey: ["transfer-pair"] });
          onDone();
        });
      }}
      isPending={isPending}
      isEditing={isEditing}
    />
  );
}

function TransferFormFields({
  accounts,
  entry,
  duplicate,
  pair,
  onSubmitTransfer,
  isPending,
  isEditing,
}: {
  accounts: AccountOption[];
  entry?: Entry;
  duplicate: boolean;
  pair?: { fromAccountId: string; toAccountId: string };
  onSubmitTransfer: (
    values: TransferFormInput,
    done: (result: {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
    }) => void,
  ) => void;
  isPending: boolean;
  isEditing: boolean;
}) {
  const form = useForm<TransferFormInput>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: entry
      ? {
          description: entry.description ?? "",
          amountCents: entry.amount_cents ?? 0,
          date: duplicate ? todayISO() : (entry.date ?? todayISO()),
          status: entry.status === "paid" && !duplicate ? "paid" : "pending",
          notes: entry.notes ?? "",
          fromAccountId: pair?.fromAccountId ?? "",
          toAccountId: pair?.toAccountId ?? "",
          affectsBalance: duplicate ? true : (entry.affects_balance ?? true),
        }
      : {
          description: "Transferência",
          amountCents: 0,
          date: todayISO(),
          status: "paid",
          notes: "",
          fromAccountId: accounts[0]?.id ?? "",
          toAccountId: "",
          affectsBalance: true,
        },
  });

  function onSubmit(values: TransferFormInput) {
    onSubmitTransfer(values, (result) => {
      applyFieldErrors(form, result.fieldErrors);
      toast.error(result.error);
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
                <Input {...field} />
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
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data</FormLabel>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="fromAccountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>De (origem)</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Conta de origem" />
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
            name="toAccountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Para (destino)</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Conta de destino" />
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
        </div>
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <StatusSelectItem value="paid" />
                  <StatusSelectItem value="pending" />
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
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
        <AdvancedHistoricalField control={form.control} />
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : null}
          {isEditing ? "Salvar" : "Criar transferência"}
        </Button>
      </form>
    </Form>
  );
}
