"use client";

import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import type { KeyMetric } from "./parse-report";

interface CapacityRadialProps {
  metrics: KeyMetric[];
}

const ringColors = ["#f97316", "#fb923c", "#fdba74"]; // orange gradient rings
const labels = ["Users", "Invoices", "Integrations"];

export function CapacityRadial({ metrics }: CapacityRadialProps) {
  const utilizationMetrics = metrics.filter(
    (m) => m.utilization && m.utilization !== "--" && m.utilization.includes("%")
  );

  if (utilizationMetrics.length === 0) return null;

  // Take up to 3 metrics for the rings
  const rings = utilizationMetrics.slice(0, 3).map((m, i) => {
    const pct = parseInt(m.utilization.replace(/[^0-9]/g, ""), 10) || 0;
    return {
      name: m.metric.replace(/^(Active |Monthly )/, "") || labels[i],
      value: pct,
      fill: ringColors[i],
    };
  });

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-[140px] h-[140px]">
        <RadialBarChart
          width={140}
          height={140}
          cx={70}
          cy={70}
          innerRadius={22}
          outerRadius={65}
          barSize={10}
          data={rings}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background dataKey="value" angleAxisId={0} cornerRadius={5} />
        </RadialBarChart>
      </div>
      <div className="flex flex-col gap-1.5">
        {rings.map((ring, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ring.fill }} />
            <span className="text-xs text-zinc-600 dark:text-zinc-400">{ring.name}</span>
            <span className="text-xs font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">{ring.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
