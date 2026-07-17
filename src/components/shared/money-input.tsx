"use client";

import * as React from "react";

import { formatCentsForInput, parseCentsFromInput } from "@/lib/money";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type MoneyInputProps = Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "type"
> & {
  /** Valor em centavos (inteiro). */
  value: number;
  onValueChange: (cents: number) => void;
  /** Permite valores negativos (ex.: saldo inicial de conta). */
  allowNegative?: boolean;
};

/**
 * Input de dinheiro em BRL: o usuário digita dígitos e o valor é sempre
 * reformatado como centavos ("1234" → "12,34"). Emite o inteiro de centavos
 * para o formulário — nunca float (decisão D1).
 */
export function MoneyInput({
  value,
  onValueChange,
  allowNegative = false,
  className,
  ...props
}: MoneyInputProps) {
  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    let cents = parseCentsFromInput(event.target.value);
    if (!allowNegative && cents < 0) cents = Math.abs(cents);
    onValueChange(cents);
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
        R$
      </span>
      <Input
        type="text"
        inputMode="numeric"
        placeholder="0,00"
        value={formatCentsForInput(value)}
        onChange={handleChange}
        className={cn("pl-9 text-right tabular-nums", className)}
        {...props}
      />
    </div>
  );
}
