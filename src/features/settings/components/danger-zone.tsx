"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { applyFieldErrors } from "@/lib/form";
import { deleteAccount } from "../actions";
import { deleteAccountSchema, type DeleteAccountInput } from "../schemas";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export function DangerZone() {
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<DeleteAccountInput>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { confirmation: "" },
  });

  function onSubmit(values: DeleteAccountInput) {
    startTransition(async () => {
      // Em sucesso a action chama redirect("/login") — não retorna.
      const result = await deleteAccount(values);
      if (!result.ok) {
        applyFieldErrors(form, result.fieldErrors);
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <AlertTriangle className="size-4" /> Excluir conta
        </CardTitle>
        <CardDescription>
          Apaga permanentemente sua conta e todos os dados: contas, categorias,
          lançamentos, cartões, recorrências, orçamentos, metas e anexos. Não
          pode ser desfeito.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="confirmation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Digite <span className="font-mono">EXCLUIR</span> para
                    confirmar
                  </FormLabel>
                  <FormControl>
                    <Input autoComplete="off" {...field} />
                  </FormControl>
                  <FormDescription>Isso não pode ser desfeito.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <Button
                type="submit"
                variant="destructive"
                disabled={isPending || form.watch("confirmation") !== "EXCLUIR"}
              >
                {isPending ? <Loader2 className="animate-spin" /> : null}
                Excluir minha conta permanentemente
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
