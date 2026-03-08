"use client";

import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";

interface UtilizationGaugeProps {
  value: number;
  max: number;
  label: string;
}

function getColor(pct: number): string {
  if (pct >= 90) return "#dc2626"; // red
  if (pct >= 75) return "#f59e0b"; // amber
  return "#10b981"; // emerald
}

export function UtilizationGauge({ value, max, label }: UtilizationGaugeProps) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const color = getColor(pct);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[100px] h-[100px]">
        <RadialBarChart
          width={100}
          height={100}
          cx={50}
          cy={50}
          innerRadius={32}
          outerRadius={46}
          barSize={10}
          data={[{ value: pct, fill: color }]}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background dataKey="value" angleAxisId={0} cornerRadius={5} />
        </RadialBarChart>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold tabular-nums" style={{ color }}>{pct}%</span>
        </div>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mt-1 text-center">
        {label}
      </span>
      <span className="text-[10px] text-zinc-400 tabular-nums">{value} / {max}</span>
    </div>
  );
}
