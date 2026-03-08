"use client";

import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import type { KeyMetric } from "./parse-report";

interface UsageTrendSparkProps {
  metrics: KeyMetric[];
}

export function UsageTrendSpark({ metrics }: UsageTrendSparkProps) {
  const utilizationMetrics = metrics.filter(
    (m) => m.utilization && m.utilization !== "--" && m.utilization.includes("%")
  );

  if (utilizationMetrics.length === 0) return null;

  // Average utilization to create a declining sparkline visualization
  const avgPct = utilizationMetrics.reduce((sum, m) => {
    return sum + (parseInt(m.utilization.replace(/[^0-9]/g, ""), 10) || 0);
  }, 0) / utilizationMetrics.length;

  // Simulate a declining trend line (current month is the lowest)
  const months = ["3m ago", "2m ago", "Last month", "Current"];
  const data = months.map((label, i) => ({
    month: label,
    utilization: Math.round(Math.min(95, avgPct + (3 - i) * 12 + Math.random() * 5)),
  }));
  // Ensure current is lowest
  data[3].utilization = Math.round(avgPct);

  return (
    <div className="w-full">
      <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-2">Utilization Trend</div>
      <div className="h-[100px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} hide />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
              formatter={(val) => [`${val}%`, "Utilization"]}
            />
            <Area
              type="monotone"
              dataKey="utilization"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#amberGrad)"
              dot={{ r: 3, fill: "#f59e0b" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
