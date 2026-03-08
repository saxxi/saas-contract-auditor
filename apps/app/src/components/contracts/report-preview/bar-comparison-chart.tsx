"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import type { KeyMetric } from "./parse-report";

interface BarComparisonChartProps {
  metrics: KeyMetric[];
  color: string; // hex color
}

function getHexColor(themeColor: string): string {
  const map: Record<string, string> = {
    "red-600": "#dc2626",
    "red-500": "#ef4444",
    "blue-600": "#2563eb",
    "blue-500": "#3b82f6",
    "amber-500": "#f59e0b",
    "orange-500": "#f97316",
    "emerald-600": "#059669",
  };
  return map[themeColor] ?? "#3b82f6";
}

export function BarComparisonChart({ metrics, color }: BarComparisonChartProps) {
  const hex = getHexColor(color);
  const utilizationMetrics = metrics.filter(
    (m) => m.utilization && m.utilization !== "--" && m.utilization.includes("%")
  );

  if (utilizationMetrics.length === 0) return null;

  const data = utilizationMetrics.map((m) => {
    const value = parseFloat(m.value.replace(/[^0-9.]/g, "")) || 0;
    const limit = parseFloat(m.limit.replace(/[^0-9.]/g, "")) || 100;
    const pct = limit > 0 ? Math.round((value / limit) * 100) : 0;
    return {
      name: m.metric.replace(/^(Active |Monthly )/, ""),
      value,
      limit,
      pct,
      overflow: value > limit,
    };
  });

  return (
    <div className="w-full h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-zinc-200)" />
          <XAxis type="number" tick={{ fontSize: 11, fill: "var(--color-zinc-400)" }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--color-zinc-500)" }}
            width={90}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            formatter={(val, name) => {
              if (name === "value") return [`${val}`, "Usage"];
              if (name === "limit") return [`${val}`, "Limit"];
              return [val, name];
            }}
          />
          <Bar dataKey="limit" fill="#e5e7eb" radius={[0, 4, 4, 0]} barSize={16} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.overflow ? "#dc2626" : hex} />
            ))}
          </Bar>
          <ReferenceLine x={0} stroke="transparent" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
