"use client";

import * as React from "react";
import Link from "next/link";
import { Repeat, TrendingUp } from "lucide-react";

import { formatMonthShortBR, todayISO } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import {
  buildProjection,
  type SimulationInput,
} from "@/services/projection";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoneyInput } from "@/components/shared/money-input";
import { ProjectionAreaChart } from "@/components/charts/projection-area-chart";
import {
  DEFAULT_CUSHION_CENTS,
  PROJECTION_HORIZONS,
  type ProjectionInputs,
} from "../types";
import { ProjectionTable, StatusBadge } from "./projection-table";
import { SimulationPanel, type SimulationForm } from "./simulation-panel";

const EMPTY_SIMULATION: SimulationForm = {
  amountCents: 0,
  installments: 1,
  firstDateISO: "",
  targetId: "account",
};

export function ProjectionView({ inputs }: { inputs: ProjectionInputs }) {
  const [months, setMonths] = React.useState<number>(6);
  const [cushionCents, setCushionCents] = React.useState(DEFAULT_CUSHION_CENTS);
  const [simulation, setSimulation] = React.useState<SimulationForm>({
    ...EMPTY_SIMULATION,
    firstDateISO: inputs.todayISO || todayISO(),
  });

  const simulationInput: SimulationInput | null = React.useMemo(() => {
    if (simulation.amountCents <= 0 || !simulation.firstDateISO) return null;
    const card = inputs.cards.find((c) => c.id === simulation.targetId);
    return {
      amountCents: simulation.amountCents,
      installments: simulation.installments,
      firstDateISO: simulation.firstDateISO,
      target: card
        ? { kind: "card", closingDay: card.closingDay, dueDay: card.dueDay }
        : { kind: "account" },
    };
  }, [simulation, inputs.cards]);

  // O motor é puro — recalcular a cada tecla é barato e dispensa round-trip.
  const projection = React.useMemo(
    () =>
      buildProjection({
        startingBalanceCents: inputs.startingBalanceCents,
        flows: inputs.flows,
        months,
        fromISO: inputs.todayISO,
        cushionCents,
        simulation: simulationInput,
      }),
    [inputs, months, cushionCents, simulationInput],
  );

  const chartData = projection.map((month) => ({
    label: formatMonthShortBR(month.monthISO),
    cumulativeCents: month.cumulativeCents,
    simulatedCumulativeCents: month.simulatedCumulativeCents,
  }));

  const last = projection.at(-1);
  const finalWithoutCents = last?.cumulativeCents ?? inputs.startingBalanceCents;
  const finalWithCents = last?.simulatedCumulativeCents ?? finalWithoutCents;
  const impactCents = finalWithoutCents - finalWithCents;

  // O mês mais crítico da curva efetiva (com simulação, se houver).
  const worst = projection.reduce<(typeof projection)[number] | null>(
    (acc, month) => {
      const value = month.simulatedCumulativeCents ?? month.cumulativeCents;
      const accValue = acc
        ? (acc.simulatedCumulativeCents ?? acc.cumulativeCents)
        : Number.POSITIVE_INFINITY;
      return value < accValue ? month : acc;
    },
    null,
  );
  const worstStatus = worst?.simulatedStatus ?? worst?.status ?? "ok";

  return (
    <div className="flex flex-col gap-6">
      {!inputs.hasRecurring && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-4 text-sm">
          <Repeat className="size-4 shrink-0 text-muted-foreground" />
          <p className="flex-1 text-muted-foreground">
            A projeção é tão boa quanto o cadastro: sem recorrências, salário e
            contas fixas não aparecem nos meses à frente.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/recorrentes">Cadastrar recorrências</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(2,minmax(0,220px))_1fr]">
        <div className="space-y-2">
          <Label htmlFor="horizon">Horizonte</Label>
          <Select
            value={String(months)}
            onValueChange={(value) => setMonths(Number(value))}
          >
            <SelectTrigger id="horizon">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECTION_HORIZONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option} meses
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cushion">Colchão mínimo</Label>
          <MoneyInput
            id="cushion"
            value={cushionCents}
            onValueChange={setCushionCents}
          />
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-sm text-muted-foreground">
              Saldo projetado para{" "}
              <span className="capitalize">
                {last ? formatMonthShortBR(last.monthISO) : "—"}
              </span>
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatCents(finalWithCents)}
            </p>
          </div>
          {worst && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Pior mês:</span>
              <span className="font-medium capitalize">
                {formatMonthShortBR(worst.monthISO)}
              </span>
              <StatusBadge status={worstStatus} />
            </div>
          )}
        </div>
        <ProjectionAreaChart data={chartData} cushionCents={cushionCents} />
      </div>

      <SimulationPanel
        value={simulation}
        onChange={setSimulation}
        onClear={() =>
          setSimulation({
            ...EMPTY_SIMULATION,
            firstDateISO: inputs.todayISO || todayISO(),
          })
        }
        cards={inputs.cards}
        impactCents={impactCents}
        finalWithoutCents={finalWithoutCents}
        finalWithCents={finalWithCents}
      />

      <div className="rounded-lg border p-4">
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <TrendingUp className="size-4 text-muted-foreground" />
          Mês a mês
        </h2>
        <ProjectionTable
          months={projection}
          startingBalanceCents={inputs.startingBalanceCents}
        />
      </div>
    </div>
  );
}
