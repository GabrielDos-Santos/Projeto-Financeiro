import type { ProjectionFlow } from "@/services/projection";

/** Cartão elegível como destino da simulação (precisa dos dias da fatura). */
export type SimulationCardOption = {
  id: string;
  name: string;
  closingDay: number;
  dueDay: number;
};

/**
 * Tudo que a projeção precisa, já convertido em eventos de caixa. Montado no
 * servidor (`queries.ts`) e entregue ao client, que recalcula a simulação
 * localmente com o motor puro.
 */
export type ProjectionInputs = {
  startingBalanceCents: number;
  flows: ProjectionFlow[];
  cards: SimulationCardOption[];
  /** Hoje no servidor — o motor é puro e recebe a data. */
  todayISO: string;
  /** Sinaliza a UI quando não há nada previsto (projeção "seca"). */
  hasRecurring: boolean;
};

export const PROJECTION_HORIZONS = [3, 6, 12] as const;
export type ProjectionHorizon = (typeof PROJECTION_HORIZONS)[number];

/** Colchão default do status "apertado" — R$ 500 (decisão g). */
export const DEFAULT_CUSHION_CENTS = 50_000;

/** Horizonte usado pelo card do dashboard. */
export const DASHBOARD_HORIZON = 6;
