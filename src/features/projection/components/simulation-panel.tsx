"use client";

import Link from "next/link";
import { Sparkles, X } from "lucide-react";

import { formatCents } from "@/lib/money";
import { splitInstallments } from "@/lib/money";
import { formatDateBR } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/shared/date-picker";
import { MoneyInput } from "@/components/shared/money-input";
import type { SimulationCardOption } from "../types";

export type SimulationForm = {
  amountCents: number;
  installments: number;
  firstDateISO: string;
  /** "account" ou o id de um cartão. */
  targetId: string;
};

/**
 * Painel "e se eu comprar?" — o coração da feature (a linha "Compra planejada"
 * da planilha). Puramente client: recalcula a projeção no motor puro a cada
 * tecla, sem requisição, e NUNCA persiste nada (decisão e). Para lançar de
 * verdade, o botão leva ao formulário normal de transação.
 */
export function SimulationPanel({
  value,
  onChange,
  onClear,
  cards,
  impactCents,
  finalWithoutCents,
  finalWithCents,
}: {
  value: SimulationForm;
  onChange: (next: SimulationForm) => void;
  onClear: () => void;
  cards: SimulationCardOption[];
  impactCents: number;
  finalWithoutCents: number;
  finalWithCents: number;
}) {
  const active = value.amountCents > 0;
  const installmentCents =
    active && value.installments > 0
      ? splitInstallments(value.amountCents, value.installments)[0]!
      : 0;

  const card = cards.find((c) => c.id === value.targetId);

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Sparkles className="size-4 text-amber-500" />
          Simular compra
        </h2>
        {active && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X /> Limpar
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sim-amount">Valor da compra</Label>
          <MoneyInput
            id="sim-amount"
            value={value.amountCents}
            onValueChange={(amountCents) => onChange({ ...value, amountCents })}
            placeholder="0,00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sim-installments">Parcelas</Label>
          <Input
            id="sim-installments"
            type="number"
            inputMode="numeric"
            min={1}
            max={60}
            value={value.installments}
            onChange={(event) =>
              onChange({
                ...value,
                installments: Math.min(
                  60,
                  Math.max(1, Number(event.target.value) || 1),
                ),
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Onde vai cair</Label>
          <Select
            value={value.targetId}
            onValueChange={(targetId) => onChange({ ...value, targetId })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="account">Direto na conta (débito)</SelectItem>
              {cards.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{card ? "Data da compra" : "Vencimento da 1ª parcela"}</Label>
          <DatePicker
            value={value.firstDateISO}
            onValueChange={(firstDateISO) =>
              onChange({ ...value, firstDateISO })
            }
          />
        </div>
      </div>

      {active && (
        <div className="mt-4 space-y-3 rounded-md bg-muted/50 p-3 text-sm">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-muted-foreground">
              {value.installments > 1
                ? `${value.installments}× de`
                : "À vista:"}
            </span>
            <span className="font-semibold tabular-nums">
              {formatCents(installmentCents)}
            </span>
            {card && (
              <span className="text-xs text-muted-foreground">
                na fatura do {card.name}
              </span>
            )}
          </p>

          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Saldo final sem a compra</dt>
              <dd className="tabular-nums">{formatCents(finalWithoutCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Saldo final com a compra</dt>
              <dd
                className={
                  finalWithCents < 0
                    ? "font-semibold tabular-nums text-rose-600 dark:text-rose-400"
                    : "font-semibold tabular-nums"
                }
              >
                {formatCents(finalWithCents)}
              </dd>
            </div>
            {impactCents > 0 && (
              <p className="pt-1 text-xs text-muted-foreground">
                Impacto de {formatCents(impactCents)} dentro do horizonte
                {value.firstDateISO &&
                  ` a partir de ${formatDateBR(value.firstDateISO)}`}
                .
              </p>
            )}
          </dl>

          {/* Mesma porta que a Command Palette usa (transactions-view.tsx). */}
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href="/transacoes?novo=1">Lançar de verdade</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
