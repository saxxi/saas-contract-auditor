import type { ObjectionHandler } from "./parse-report";

interface ObjectionCardProps {
  item: ObjectionHandler;
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

export function ObjectionCard({ item, themeColor = "blue-600" }: ObjectionCardProps) {
  return (
    <div className={`border-l-3 ${borderColors[themeColor] ?? "border-blue-500 dark:border-blue-400"} ${bgColors[themeColor] ?? "bg-blue-50/50 dark:bg-blue-900/10"} rounded-r-lg px-4 py-3`}>
      <div className="text-sm font-medium italic text-zinc-800 dark:text-zinc-200">
        &ldquo;{item.objection}&rdquo;
      </div>
      <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5">
        {item.rebuttal}
      </div>
    </div>
  );
}
