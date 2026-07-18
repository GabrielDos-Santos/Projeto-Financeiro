"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { applyFieldErrors } from "@/lib/form";
import { updatePreferences } from "../actions";
import { preferencesFormSchema, type PreferencesFormInput } from "../schemas";
import {
  CURRENCY_LABELS,
  CURRENCY_OPTIONS,
  LOCALE_LABELS,
  LOCALE_OPTIONS,
  type Settings,
} from "../types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";

export function PreferencesForm({ settings }: { settings: Settings }) {
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<PreferencesFormInput>({
    resolver: zodResolver(preferencesFormSchema),
    defaultValues: {
      currency: CURRENCY_OPTIONS.includes(
        settings.currency as (typeof CURRENCY_OPTIONS)[number],
      )
        ? (settings.currency as (typeof CURRENCY_OPTIONS)[number])
        : "BRL",
      locale: LOCALE_OPTIONS.includes(
        settings.locale as (typeof LOCALE_OPTIONS)[number],
      )
        ? (settings.locale as (typeof LOCALE_OPTIONS)[number])
        : "pt-BR",
      notifyBudgetAlerts: settings.notify_budget_alerts,
      notifyInvoiceDue: settings.notify_invoice_due,
    },
  });

  function onSubmit(values: PreferencesFormInput) {
    startTransition(async () => {
      const result = await updatePreferences(values);
      if (!result.ok) {
        applyFieldErrors(form, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success("Preferências atualizadas.");
    });
  }

  return (
    <Card>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moeda</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {CURRENCY_LABELS[currency]}
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
                name="locale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Idioma</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LOCALE_OPTIONS.map((locale) => (
                          <SelectItem key={locale} value={locale}>
                            {LOCALE_LABELS[locale]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Tema (claro/escuro) fica no botão de sol/lua da barra superior —
              some efeito imediato, sem precisar salvar aqui.
            </p>
            <FormField
              control={form.control}
              name="notifyBudgetAlerts"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border px-3 py-2.5">
                  <div className="space-y-0.5">
                    <FormLabel>Alertas de orçamento</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Avisar ao cruzar o teto de uma categoria.
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notifyInvoiceDue"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border px-3 py-2.5">
                  <div className="space-y-0.5">
                    <FormLabel>Vencimento de fatura</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Avisar quando uma fatura estiver perto de vencer.
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" /> : null}
                Salvar
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
