import { addMonths, startOfMonth } from "date-fns";

import { parseDateOnly, toDateOnly } from "@/lib/dates";
import { splitInstallments } from "@/lib/money";
import { buildInstallmentPlan } from "./installments";
import { computeInvoicePeriod } from "./invoices";

/**
 * Motor da projeção de saldo (Fase 20) — puro e sem I/O, como
 * `buildInstallmentPlan()` e `nextOccurrences()`: roda no RSC (primeira
 * renderização) E no client (a simulação recalcula localmente, sem
 * round-trip).
 *
 * Regra de caixa (estende as decisões 5/34 para o futuro): compra em cartão
 * NUNCA entra pelo item — entra pelo total da fatura no vencimento. Quem monta
 * os `ProjectionFlow` (`features/projection/queries.ts`) já entrega tudo
 * convertido em eventos de caixa; aqui só bucketamos por mês e acumulamos.
 */

export type ProjectionSource =
  | "pending"
  | "installment"
  | "loan"
  | "invoice"
  | "recurring"
  | "simulation";

/** Um evento de caixa futuro. `amountCents` é ASSINADO: + entra, − sai. */
export type ProjectionFlow = {
  dateISO: string;
  amountCents: number;
  source: ProjectionSource;
  /** Detalhe do evento ("Empréstimo Caixa 3/12"). */
  label: string;
  /** Chave de agrupamento na tabela (regra, cartão, empréstimo…). */
  groupId: string;
  /** Rótulo estável da LINHA da tabela ("Empréstimo Caixa") — sem o k/n. */
  groupLabel: string;
};

export type MonthStatus = "ok" | "tight" | "negative";

export type ProjectionMonth = {
  monthISO: string; // "YYYY-MM-01"
  incomeCents: number;
  expenseCents: number; // magnitude positiva
  netCents: number; // saldo do mês
  cumulativeCents: number; // saldo acumulado (com a reserva)
  status: MonthStatus;
  /**
   * Mesmos agregados COM a compra simulada — `null` quando não há simulação.
   * A UI mostra sempre `simulado ?? real`: como a linha da simulação aparece
   * dentro de Despesas, os totais precisam incluí-la ou a coluna não fecha
   * (era assim na planilha: "Compra planejada" somava no total de despesas).
   */
  simulatedIncomeCents: number | null;
  simulatedExpenseCents: number | null;
  simulatedNetCents: number | null;
  simulatedCumulativeCents: number | null;
  simulatedStatus: MonthStatus | null;
  flows: ProjectionFlow[];
};

export type SimulationTarget =
  | { kind: "account" }
  | { kind: "card"; closingDay: number; dueDay: number };

export type SimulationInput = {
  amountCents: number;
  /** 1 = à vista. */
  installments: number;
  /** Em conta: vencimento da 1ª parcela. Em cartão: data da compra. */
  firstDateISO: string;
  target: SimulationTarget;
  label?: string;
};

export type BuildProjectionInput = {
  startingBalanceCents: number;
  flows: ProjectionFlow[];
  /** Horizonte em meses, contando o mês de `fromISO`. */
  months: number;
  /** Hoje (injetado para o motor continuar puro/testável). */
  fromISO: string;
  /** Abaixo disto o mês fica "apertado". */
  cushionCents: number;
  simulation?: SimulationInput | null;
};

/**
 * Parcelas da compra simulada como eventos de caixa.
 * - Em CONTA: cada parcela sai no próprio vencimento (âncora sem drift —
 *   `buildInstallmentPlan`, decisão 32).
 * - Em CARTÃO: a parcela k cai na fatura da competência de
 *   `addMonths(compra, k)` e só sai do caixa no VENCIMENTO daquela fatura.
 */
export function buildSimulationFlows(
  simulation: SimulationInput,
): ProjectionFlow[] {
  const { amountCents, installments, firstDateISO, target } = simulation;
  if (amountCents <= 0 || installments < 1) return [];

  const label = simulation.label?.trim() || "Compra simulada";
  const suffix = (n: number) =>
    installments > 1 ? ` ${n}/${installments}` : "";

  if (target.kind === "account") {
    return buildInstallmentPlan(amountCents, installments, firstDateISO).map(
      (item) => ({
        dateISO: item.dueDate,
        amountCents: -item.amountCents,
        source: "simulation" as const,
        label: `${label}${suffix(item.number)}`,
        groupId: "simulation",
        groupLabel: label,
      }),
    );
  }

  const purchase = parseDateOnly(firstDateISO);
  return splitInstallments(amountCents, installments).map((cents, index) => {
    const purchaseISO = toDateOnly(addMonths(purchase, index));
    const { dueDate } = computeInvoicePeriod(
      target.closingDay,
      target.dueDay,
      purchaseISO,
    );
    return {
      dateISO: dueDate,
      amountCents: -cents,
      source: "simulation" as const,
      label: `${label}${suffix(index + 1)}`,
      groupId: "simulation",
      groupLabel: label,
    };
  });
}

function statusFor(cumulativeCents: number, cushionCents: number): MonthStatus {
  if (cumulativeCents < 0) return "negative";
  if (cumulativeCents < cushionCents) return "tight";
  return "ok";
}

/** Meses do horizonte, do mês de `fromISO` em diante. */
function buildMonthKeys(fromISO: string, months: number): string[] {
  const first = startOfMonth(parseDateOnly(fromISO));
  return Array.from({ length: Math.max(0, months) }, (_, i) =>
    toDateOnly(addMonths(first, i)),
  );
}

/**
 * Mês em que o fluxo pesa no caixa. Pendente ATRASADO (data no passado) cai no
 * mês corrente — vai sair da conta assim que for pago, como na planilha.
 */
function bucketOf(dateISO: string, fromISO: string): string {
  const effective = dateISO < fromISO ? fromISO : dateISO;
  return toDateOnly(startOfMonth(parseDateOnly(effective)));
}

export function buildProjection(
  input: BuildProjectionInput,
): ProjectionMonth[] {
  const {
    startingBalanceCents,
    flows,
    months,
    fromISO,
    cushionCents,
    simulation,
  } = input;

  const monthKeys = buildMonthKeys(fromISO, months);
  const horizon = new Set(monthKeys);

  const byMonth = new Map<string, ProjectionFlow[]>();
  for (const key of monthKeys) byMonth.set(key, []);

  for (const flow of flows) {
    const bucket = bucketOf(flow.dateISO, fromISO);
    if (horizon.has(bucket)) byMonth.get(bucket)!.push(flow);
  }

  const simulationFlows = simulation ? buildSimulationFlows(simulation) : [];
  const simulatedByMonth = new Map<string, number>();
  for (const flow of simulationFlows) {
    const bucket = bucketOf(flow.dateISO, fromISO);
    if (!horizon.has(bucket)) continue;
    simulatedByMonth.set(
      bucket,
      (simulatedByMonth.get(bucket) ?? 0) + flow.amountCents,
    );
    byMonth.get(bucket)!.push(flow);
  }
  const hasSimulation = simulationFlows.length > 0;

  let cumulative = startingBalanceCents;
  let simulatedCumulative = startingBalanceCents;

  return monthKeys.map((monthISO) => {
    const monthFlows = (byMonth.get(monthISO) ?? [])
      .slice()
      .sort((a, b) => a.dateISO.localeCompare(b.dateISO));

    const sumIn = (list: ProjectionFlow[]) =>
      list.filter((f) => f.amountCents > 0).reduce((s, f) => s + f.amountCents, 0);
    const sumOut = (list: ProjectionFlow[]) =>
      list.filter((f) => f.amountCents < 0).reduce((s, f) => s - f.amountCents, 0);

    // Curva REAL: só o que já está comprometido (a 2ª série do gráfico).
    const realFlows = monthFlows.filter((f) => f.source !== "simulation");
    const incomeCents = sumIn(realFlows);
    const expenseCents = sumOut(realFlows);
    const netCents = incomeCents - expenseCents;
    cumulative += netCents;

    // Curva SIMULADA: os mesmos agregados contando a compra.
    const simulatedDelta = simulatedByMonth.get(monthISO) ?? 0;
    const simulatedNetCents = hasSimulation ? netCents + simulatedDelta : null;
    if (hasSimulation) simulatedCumulative += netCents + simulatedDelta;

    return {
      monthISO,
      incomeCents,
      expenseCents,
      netCents,
      cumulativeCents: cumulative,
      status: statusFor(cumulative, cushionCents),
      simulatedIncomeCents: hasSimulation ? sumIn(monthFlows) : null,
      simulatedExpenseCents: hasSimulation ? sumOut(monthFlows) : null,
      simulatedNetCents,
      simulatedCumulativeCents: hasSimulation ? simulatedCumulative : null,
      simulatedStatus: hasSimulation
        ? statusFor(simulatedCumulative, cushionCents)
        : null,
      flows: monthFlows,
    };
  });
}

/** Linha da tabela estilo planilha: uma fonte × os meses do horizonte. */
export type ProjectionRow = {
  groupId: string;
  label: string;
  source: ProjectionSource;
  /** Total por mês, na ordem de `months` (assinado). */
  amountsByMonth: number[];
  totalCents: number;
};

/**
 * Agrupa os fluxos já bucketados em linhas (Salário, Fatura Nubank,
 * Faculdade…) — o formato que o usuário conhecia da planilha.
 */
export function buildProjectionRows(
  months: ProjectionMonth[],
  direction: "income" | "expense",
): ProjectionRow[] {
  const rows = new Map<string, ProjectionRow>();

  months.forEach((month, index) => {
    for (const flow of month.flows) {
      const isIncome = flow.amountCents > 0;
      if (direction === "income" ? !isIncome : isIncome) continue;

      let row = rows.get(flow.groupId);
      if (!row) {
        row = {
          groupId: flow.groupId,
          label: flow.groupLabel,
          source: flow.source,
          amountsByMonth: Array<number>(months.length).fill(0),
          totalCents: 0,
        };
        rows.set(flow.groupId, row);
      }
      row.amountsByMonth[index]! += flow.amountCents;
      row.totalCents += flow.amountCents;
    }
  });

  return [...rows.values()].sort(
    (a, b) => Math.abs(b.totalCents) - Math.abs(a.totalCents),
  );
}
