import type { ResolutionOption } from "./parse-report";

interface OptionCardProps {
  option: ResolutionOption;
  label: string; // "Option A", "Option B"
  recommended?: boolean;
  themeColor?: string; // Tailwind color base e.g. "blue-600"
}

const recommendedGradients: Record<string, string> = {
  "red-600": "from-red-500 to-red-600",
  "blue-600": "from-blue-500 to-blue-600",
  "amber-500": "from-amber-400 to-amber-500",
  "orange-500": "from-orange-400 to-orange-500",
  "emerald-600": "from-emerald-500 to-emerald-600",
};

const recommendedBorders: Record<string, string> = {
  "red-600": "border-red-400 dark:border-red-500 shadow-red-500/10",
  "blue-600": "border-blue-400 dark:border-blue-500 shadow-blue-500/10",
  "amber-500": "border-amber-400 dark:border-amber-500 shadow-amber-500/10",
  "orange-500": "border-orange-400 dark:border-orange-500 shadow-orange-500/10",
  "emerald-600": "border-emerald-400 dark:border-emerald-500 shadow-emerald-500/10",
};

export function OptionCard({ option, label, recommended, themeColor = "amber-500" }: OptionCardProps) {
  return (
    <div
      className={`
        relative rounded-xl overflow-hidden border
        ${recommended
          ? `${recommendedBorders[themeColor] ?? "border-amber-400 dark:border-amber-500 shadow-amber-500/10"} shadow-lg`
          : "border-zinc-200 dark:border-zinc-700"
        }
        bg-white/70 dark:bg-zinc-800/50
        backdrop-blur-sm
      `}
    >
      {/* Gradient header */}
      <div
        className={`px-4 py-2.5 text-sm font-semibold tracking-wide ${
          recommended
            ? `bg-gradient-to-r ${recommendedGradients[themeColor] ?? "from-amber-500 to-amber-600"} text-white`
            : "bg-gradient-to-r from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-800 text-zinc-700 dark:text-zinc-200"
        }`}
      >
        <div className="flex items-center gap-2">
          <span>{label}: {option.name}</span>
          {recommended && (
            <span className="text-[9px] uppercase tracking-widest bg-white/20 px-1.5 py-0.5 rounded font-bold">
              Recommended
            </span>
          )}
        </div>
      </div>
      {/* Body rows */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
        {[
          { label: "Action", value: option.action },
          { label: "Upside", value: option.upside },
          { label: "Risk", value: option.risk },
          { label: "Timeline", value: option.timeline },
        ].map((row) => (
          <div key={row.label} className="px-4 py-2.5 flex gap-3">
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 w-16 shrink-0 pt-0.5">
              {row.label}
            </span>
            <span className="text-sm text-zinc-700 dark:text-zinc-300">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
