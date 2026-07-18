"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { applyFieldErrors } from "@/lib/form";
import { formatCents } from "@/lib/money";
import { contributeToGoal } from "../actions";
import { contributeSchema, type ContributeInput } from "../schemas";
import type { Goal } from "../types";
import { Button } from "@/components/ui/button";
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
import { MoneyInput } from "@/components/shared/money-input";

export function ContributeDialog({
  goal,
  open,
  onOpenChange,
}: {
  goal: Goal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<ContributeInput>({
    resolver: zodResolver(contributeSchema),
    defaultValues: { amountCents: 0 },
  });

  React.useEffect(() => {
    if (open) form.reset({ amountCents: 0 });
  }, [open, form]);

  function onSubmit(values: ContributeInput) {
    startTransition(async () => {
      const result = await contributeToGoal(goal.id, values);
      if (!result.ok) {
        applyFieldErrors(form, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(
        result.data.completed
          ? `Meta "${goal.name}" concluída! 🎉`
          : "Aporte registrado.",
      );
      onOpenChange(false);
    });
  }

  const remaining = Math.max(
    0,
    goal.target_amount_cents - goal.current_amount_cents,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aportar em &quot;{goal.name}&quot;</DialogTitle>
          <DialogDescription>
            Faltam {formatCents(remaining)} para o alvo de{" "}
            {formatCents(goal.target_amount_cents)}.
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
              name="amountCents"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor do aporte</FormLabel>
                  <FormControl>
                    <MoneyInput
                      value={field.value}
                      onValueChange={field.onChange}
                      autoFocus
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
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" /> : null}
                Aportar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
