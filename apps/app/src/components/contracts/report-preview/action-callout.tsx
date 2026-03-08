import type { ReportTheme } from "./theme-config";
import type { KeyMetric } from "./parse-report";

interface ActionCalloutProps {
  theme: ReportTheme;
  metrics: KeyMetric[];
}

function getHighlightText(icon: string, metrics: KeyMetric[]): string | null {
  const utilizationMetrics = metrics.filter(
    (m) => m.utilization && m.utilization !== "--" && m.utilization.includes("%")
  );

  switch (icon) {
    case "alert": {
      // Show breached limits
      const breached = utilizationMetrics.filter((m) => {
        const pct = parseInt(m.utilization.replace(/[^0-9]/g, ""), 10) || 0;
        return pct >= 100;
      });
      if (breached.length > 0) {
        return breached.map((m) => `${m.metric}: ${m.utilization}`).join(" | ");
      }
      return utilizationMetrics.length > 0
        ? utilizationMetrics.map((m) => `${m.metric}: ${m.utilization}`).join(" | ")
        : null;
    }
    case "revenue": {
      // Show estimated uplift from MRR
      const mrr = metrics.find((m) => m.metric.toLowerCase().includes("mrr"));
      if (mrr) return `Current MRR: ${mrr.value}`;
      return null;
    }
    case "trend": {
      // Show lowest utilization
      if (utilizationMetrics.length === 0) return null;
      const lowest = utilizationMetrics.reduce((min, m) => {
        const pct = parseInt(m.utilization.replace(/[^0-9]/g, ""), 10) || 0;
        const minPct = parseInt(min.utilization.replace(/[^0-9]/g, ""), 10) || 0;
        return pct < minPct ? m : min;
      });
      return `Lowest: ${lowest.metric} at ${lowest.utilization}`;
    }
    case "capacity": {
      // Show highest utilization
      if (utilizationMetrics.length === 0) return null;
      const highest = utilizationMetrics.reduce((max, m) => {
        const pct = parseInt(m.utilization.replace(/[^0-9]/g, ""), 10) || 0;
        const maxPct = parseInt(max.utilization.replace(/[^0-9]/g, ""), 10) || 0;
        return pct > maxPct ? m : max;
      });
      return `Highest: ${highest.metric} at ${highest.utilization}`;
    }
    default:
      return null;
  }
}

const iconMap: Record<string, string> = {
  alert: "!",
  revenue: "$",
  trend: "↓",
  capacity: "◉",
  check: "✓",
};

export function ActionCallout({ theme, metrics }: ActionCalloutProps) {
  const callout = theme.actionCallout;
  if (!callout) return null;

  const highlight = getHighlightText(callout.icon, metrics);

  return (
    <div className={`${callout.color} border-l-4 ${callout.borderColor} rounded-r-lg px-5 py-4 flex items-start gap-3`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${callout.textColor} bg-white/60 dark:bg-white/10`}>
        {iconMap[callout.icon] ?? "!"}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold ${callout.textColor}`}>
          {callout.label}
        </div>
        {highlight && (
          <div className={`text-xs mt-1 ${callout.textColor} opacity-80 font-mono tabular-nums`}>
            {highlight}
          </div>
        )}
      </div>
    </div>
  );
}
