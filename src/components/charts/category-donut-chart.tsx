"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatCents } from "@/lib/money";

type Slice = {
  name: string;
  color: string;
  amountCents: number;
};

function DonutTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { color: string } }[];
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0]!;
  const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
  return (
    <div className="rounded-md border bg-popover p-2 text-sm text-popover-foreground shadow-md">
      <p className="flex items-center gap-2">
        <span
          className="size-2.5 rounded-full"
          style={{ backgroundColor: item.payload.color }}
          aria-hidden
        />
        <span className="text-muted-foreground">{item.name}</span>
        <span className="ml-auto tabular-nums">
          {formatCents(item.value)} · {pct}%
        </span>
      </p>
    </div>
  );
}

/** Donut de gastos por categoria — cada fatia usa a cor da própria categoria. */
export function CategoryDonutChart({ data }: { data: Slice[] }) {
  const total = data.reduce((sum, s) => sum + s.amountCents, 0);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amountCents"
          nameKey="name"
          innerRadius={64}
          outerRadius={96}
          paddingAngle={2}
          stroke="var(--card)"
          strokeWidth={2}
        >
          {data.map((slice) => (
            <Cell key={slice.name} fill={slice.color} />
          ))}
        </Pie>
        <Tooltip content={<DonutTooltip total={total} />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
