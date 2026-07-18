"use client";

import { RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";

type GoalProgressRadialProps = {
  /** 0–100 */
  pct: number;
  color: string;
  size?: number;
};

/** Anel de progresso de uma meta — uma única série, sem legenda (§6). */
export function GoalProgressRadial({
  pct,
  color,
  size = 96,
}: GoalProgressRadialProps) {
  const data = [{ name: "progresso", value: pct, fill: color }];

  return (
    <div style={{ width: size, height: size }} className="relative shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={data}
          startAngle={90}
          endAngle={-270}
          innerRadius="70%"
          outerRadius="100%"
          barSize={8}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={4}
            background={{ fill: "var(--secondary)" }}
            fill={color}
            isAnimationActive={false}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums">
        {pct}%
      </span>
    </div>
  );
}
