import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";

import { formatMonthShortBR } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { buildProjection } from "@/services/projection";
import { Button } from "@/components/ui/button";
import { getProjectionInputs } from "../queries";
import { DASHBOARD_HORIZON, DEFAULT_CUSHION_CENTS } from "../types";
import { StatusBadge } from "./projection-table";

/**
 * Card da projeção no dashboard (Server Component): resumo de 6 meses com o
 * saldo ao fim do horizonte e o mês mais apertado. Detalhe e simulação ficam
 * em `/projecao`.
 */
export async function ProjectionCard() {
  const inputs = await getProjectionInputs(DASHBOARD_HORIZON);
  const months = buildProjection({
    startingBalanceCents: inputs.startingBalanceCents,
    flows: inputs.flows,
    months: DASHBOARD_HORIZON,
    fromISO: inputs.todayISO,
    cushionCents: DEFAULT_CUSHION_CENTS,
  });

  const last = months.at(-1);
  if (!last) return null;

  const worst = months.reduce((acc, month) =>
    month.cumulativeCents < acc.cumulativeCents ? month : acc,
  );
  const maxAbs = Math.max(
    ...months.map((m) => Math.abs(m.cumulativeCents)),
    1,
  );

  return (
    <section className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <TrendingUp className="size-4 text-muted-foreground" />
          Projeção
        </h2>
        <Button asChild variant="ghost" size="sm">
          <Link href="/projecao">
            Ver detalhes <ArrowRight />
          </Link>
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Em <span className="capitalize">{formatMonthShortBR(last.monthISO)}</span>{" "}
        você terá aproximadamente
      </p>
      <p className="text-2xl font-semibold tabular-nums">
        {formatCents(last.cumulativeCents)}
      </p>

      {/* Sparkline sem lib: barras proporcionais ao acumulado de cada mês. */}
      <div className="mt-4 flex h-16 items-end gap-1" aria-hidden>
        {months.map((month) => {
          const height = Math.max(
            4,
            (Math.abs(month.cumulativeCents) / maxAbs) * 100,
          );
          return (
            <div
              key={month.monthISO}
              className="flex-1 rounded-sm bg-primary/20 data-[negative=true]:bg-rose-500/40"
              data-negative={month.cumulativeCents < 0}
              style={{ height: `${height}%` }}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] uppercase text-muted-foreground">
        <span className="capitalize">{formatMonthShortBR(months[0]!.monthISO)}</span>
        <span className="capitalize">{formatMonthShortBR(last.monthISO)}</span>
      </div>

      {worst.status !== "ok" && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <StatusBadge status={worst.status} />
          <span className="text-muted-foreground">
            <span className="capitalize">
              {formatMonthShortBR(worst.monthISO)}
            </span>{" "}
            fecha em {formatCents(worst.cumulativeCents)}
          </span>
        </p>
      )}
    </section>
  );
}
