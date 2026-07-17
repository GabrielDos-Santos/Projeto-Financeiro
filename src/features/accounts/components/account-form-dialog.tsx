"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { applyFieldErrors } from "@/lib/form";
import { createAccount, updateAccount } from "../actions";
import { accountFormSchema, type AccountFormInput } from "../schemas";
import { ACCOUNT_TYPE_LABELS, type AccountWithBalance } from "../types";
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
import { ColorPicker } from "@/components/shared/color-picker";
import { IconPicker } from "@/components/shared/icon-picker";
import { MoneyInput } from "@/components/shared/money-input";

const DEFAULT_VALUES: AccountFormInput = {
  name: "",
  type: "bank",
  initialBalanceCents: 0,
  color: "#3b82f6",
  icon: "wallet",
};

type AccountFormDialogProps = {
  /** Presente = edição; ausente = criação. */
  account?: AccountWithBalance;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Trigger opcional (botão "Nova conta"). */
  children?: React.ReactNode;
};

export function AccountFormDialog({
  account,
  open: controlledOpen,
  onOpenChange,
  children,
}: AccountFormDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const [isPending, startTransition] = React.useTransition();
  const isEditing = Boolean(account?.account_id);

  const form = useForm<AccountFormInput>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset(
      account
        ? {
            name: account.name ?? "",
            type: account.type ?? "bank",
            initialBalanceCents: account.initial_balance_cents ?? 0,
            color: account.color ?? DEFAULT_VALUES.color,
            icon: account.icon ?? DEFAULT_VALUES.icon,
          }
        : DEFAULT_VALUES,
    );
  }, [open, account, form]);

  function onSubmit(values: AccountFormInput) {
    startTransition(async () => {
      const result = isEditing
        ? await updateAccount(account!.account_id, values)
        : await createAccount(values);

      if (!result.ok) {
        applyFieldErrors(form, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(isEditing ? "Conta atualizada." : "Conta criada.");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar conta" : "Nova conta"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "O saldo atual é derivado dos lançamentos — aqui você ajusta apenas o saldo inicial."
              : "O saldo da conta será o saldo inicial mais os lançamentos pagos."}
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
                    <Input placeholder="Ex.: Nubank, Carteira…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(ACCOUNT_TYPE_LABELS).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="initialBalanceCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Saldo inicial</FormLabel>
                    <FormControl>
                      <MoneyInput
                        value={field.value}
                        onValueChange={field.onChange}
                        allowNegative
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <FormControl>
                    <ColorPicker
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
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ícone</FormLabel>
                  <FormControl>
                    <IconPicker
                      value={field.value}
                      onValueChange={field.onChange}
                      accentColor={form.watch("color")}
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
                {isEditing ? "Salvar" : "Criar conta"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
