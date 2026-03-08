import type { EvidenceItem } from "./parse-report";

interface EvidenceCardProps {
  item: EvidenceItem;
  themeColor?: string;
}

const borderColors: Record<string, string> = {
  "red-600": "border-red-500 dark:border-red-400",
  "red-500": "border-red-500 dark:border-red-400",
  "blue-600": "border-blue-500 dark:border-blue-400",
  "blue-500": "border-blue-500 dark:border-blue-400",
  "amber-500": "border-amber-500 dark:border-amber-400",
  "orange-500": "border-orange-500 dark:border-orange-400",
  "emerald-600": "border-emerald-500 dark:border-emerald-400",
  "emerald-500": "border-emerald-500 dark:border-emerald-400",
};

const bgColors: Record<string, string> = {
  "red-600": "bg-red-50/50 dark:bg-red-900/10",
  "blue-600": "bg-blue-50/50 dark:bg-blue-900/10",
  "amber-500": "bg-amber-50/50 dark:bg-amber-900/10",
  "orange-500": "bg-orange-50/50 dark:bg-orange-900/10",
  "emerald-600": "bg-emerald-50/50 dark:bg-emerald-900/10",
};

const badgeBgColors: Record<string, string> = {
  "red-600": "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  "blue-600": "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  "amber-500": "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  "orange-500": "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
  "emerald-600": "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
};

export function EvidenceCard({ item, themeColor = "blue-600" }: EvidenceCardProps) {
  // Split at first period to separate "what happened" from "what it means"
  const dotIndex = item.text.indexOf(". ");
  const happened = dotIndex >= 0 ? item.text.slice(0, dotIndex + 1) : item.text;
  const means = dotIndex >= 0 ? item.text.slice(dotIndex + 2) : "";

  return (
    <div className={`border-l-3 ${borderColors[themeColor] ?? "border-blue-500 dark:border-blue-400"} ${bgColors[themeColor] ?? "bg-blue-50/50 dark:bg-blue-900/10"} rounded-r-lg px-4 py-3`}>
      <div className="flex items-start gap-2">
        {item.dealId && (
          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${badgeBgColors[themeColor] ?? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"} shrink-0 mt-0.5`}>
            {item.dealId}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-zinc-800 dark:text-zinc-200">{happened}</div>
          {means && <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 italic">{means}</div>}
        </div>
      </div>
    </div>
  );
}
