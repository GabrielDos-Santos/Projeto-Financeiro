"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { applyFieldErrors } from "@/lib/form";
import { createGoal, updateGoal } from "../actions";
import { goalFormSchema, type GoalFormInput } from "../schemas";
import type { Goal } from "../types";
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
import { Textarea } from "@/components/ui/textarea";
import { ColorPicker } from "@/components/shared/color-picker";
import { DatePicker } from "@/components/shared/date-picker";
import { IconPicker } from "@/components/shared/icon-picker";
import { MoneyInput } from "@/components/shared/money-input";

const DEFAULT_VALUES: GoalFormInput = {
  name: "",
  description: "",
  targetAmountCents: 0,
  targetDate: "",
  color: "#14b8a6",
  icon: "piggy-bank",
};

type GoalFormDialogProps = {
  goal?: Goal;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
};

export function GoalFormDialog({
  goal,
  open: controlledOpen,
  onOpenChange,
  children,
}: GoalFormDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const [isPending, startTransition] = React.useTransition();
  const isEditing = Boolean(goal);

  const form = useForm<GoalFormInput>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset(
      goal
        ? {
            name: goal.name,
            description: goal.description ?? "",
            targetAmountCents: goal.target_amount_cents,
            targetDate: goal.target_date ?? "",
            color: goal.color ?? DEFAULT_VALUES.color,
            icon: goal.icon ?? DEFAULT_VALUES.icon,
          }
        : DEFAULT_VALUES,
    );
  }, [open, goal, form]);

  function onSubmit(values: GoalFormInput) {
    startTransition(async () => {
      const result = isEditing
        ? await updateGoal(goal!.id, values)
        : await createGoal(values);
      if (!result.ok) {
        applyFieldErrors(form, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(isEditing ? "Meta atualizada." : "Meta criada.");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar meta" : "Nova meta"}</DialogTitle>
          <DialogDescription>
            Defina o valor alvo e, se quiser, uma data — você aporta aos poucos
            até chegar lá.
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
                    <Input placeholder="Ex.: Viagem, Reserva…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="targetAmountCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor alvo</FormLabel>
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
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data alvo (opcional)</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        placeholder="Sem data"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                {isEditing ? "Salvar" : "Criar meta"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
