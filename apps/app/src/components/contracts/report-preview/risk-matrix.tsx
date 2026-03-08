import type { RiskRow } from "./parse-report";

interface RiskMatrixProps {
  risks: RiskRow[];
}

const likelihoodStyles: Record<string, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  med: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
};

export function RiskMatrix({ risks }: RiskMatrixProps) {
  return (
    <div className="space-y-2">
      {risks.map((r, i) => {
        const key = r.likelihood.toLowerCase().trim();
        const badgeStyle = likelihoodStyles[key] ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
        return (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40 px-4 py-3"
          >
            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 mt-0.5 ${badgeStyle}`}>
              {r.likelihood}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{r.risk}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{r.mitigant}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
