"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCents } from "@/lib/money";

const BALANCE_COLOR = "#6366f1"; // indigo — saldo acumulado projetado
const SIMULATION_COLOR = "#f59e0b"; // amber — curva "e se eu comprar?"
const CUSHION_COLOR = "#94a3b8"; // slate — linha do colchão

export type ProjectionPoint = {
  label: string;
  cumulativeCents: number;
  simulatedCumulativeCents: number | null;
};

/** Compacta centavos p/ eixo: 150000 → "R$ 1,5 mil". */
function compactBRL(cents: number): string {
  const reais = cents / 100;
  if (Math.abs(reais) >= 1000) {
    return `R$ ${(reais / 1000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })} mil`;
  }
  return `R$ ${reais.toLocaleString("pt-BR")}`;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number | null; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover p-2 text-sm text-popover-foreground shadow-md">
      <p className="mb-1 font-medium capitalize">{label}</p>
      {payload
        .filter((item) => item.value !== null && item.value !== undefined)
        .map((item) => (
          <p key={item.name} className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
              aria-hidden
            />
            <span className="text-muted-foreground">{item.name}</span>
            <span className="ml-auto tabular-nums">
              {formatCents(item.value ?? 0)}
            </span>
          </p>
        ))}
    </div>
  );
}

export function ProjectionAreaChart({
  data,
  cushionCents,
}: {
  data: ProjectionPoint[];
  cushionCents: number;
}) {
  const hasSimulation = data.some(
    (point) => point.simulatedCumulativeCents !== null,
  );

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          className="stroke-border"
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground capitalize"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={72}
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
          tickFormatter={compactBRL}
        />
        <Tooltip content={<ChartTooltip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />

        {/* Zero e colchão: as duas linhas que dizem "cuidado". */}
        <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.3} />
        {cushionCents > 0 && (
          <ReferenceLine
            y={cushionCents}
            stroke={CUSHION_COLOR}
            strokeDasharray="4 4"
            label={{
              value: "colchão",
              position: "insideTopRight",
              fontSize: 11,
              fill: CUSHION_COLOR,
            }}
          />
        )}

        <defs>
          <linearGradient id="projectionFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={BALANCE_COLOR} stopOpacity={0.35} />
            <stop offset="95%" stopColor={BALANCE_COLOR} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="cumulativeCents"
          name="Saldo projetado"
          stroke={BALANCE_COLOR}
          strokeWidth={2}
          fill="url(#projectionFill)"
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        {hasSimulation && (
          <Line
            type="monotone"
            dataKey="simulatedCumulativeCents"
            name="Com a compra"
            stroke={SIMULATION_COLOR}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={{ r: 3 }}
            connectNulls
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
