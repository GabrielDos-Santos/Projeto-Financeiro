"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCents } from "@/lib/money";

const INCOME_COLOR = "#10b981"; // emerald — receita (consistente com MoneyDisplay)
const EXPENSE_COLOR = "#f43f5e"; // rose — despesa

type Point = {
  label: string;
  incomeCents: number;
  expenseCents: number;
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
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover p-2 text-sm text-popover-foreground shadow-md">
      <p className="mb-1 font-medium capitalize">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="flex items-center gap-2">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          <span className="text-muted-foreground">{item.name}</span>
          <span className="ml-auto tabular-nums">
            {formatCents(item.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

export function IncomeExpenseBarChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        barGap={4}
        margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
      >
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
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ fill: "currentColor", opacity: 0.06 }}
        />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
        <Bar
          dataKey="incomeCents"
          name="Receitas"
          fill={INCOME_COLOR}
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
        />
        <Bar
          dataKey="expenseCents"
          name="Despesas"
          fill={EXPENSE_COLOR}
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
