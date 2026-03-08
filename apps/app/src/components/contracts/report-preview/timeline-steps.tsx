import type { NextStep } from "./parse-report";

interface TimelineStepsProps {
  steps: NextStep[];
  themeColor?: string;
}

const circleGradients: Record<string, string> = {
  "red-600": "from-red-500 to-red-700 shadow-red-500/20",
  "blue-600": "from-blue-500 to-blue-700 shadow-blue-500/20",
  "amber-500": "from-amber-400 to-amber-600 shadow-amber-500/20",
  "orange-500": "from-orange-400 to-orange-600 shadow-orange-500/20",
  "emerald-600": "from-emerald-500 to-emerald-700 shadow-emerald-500/20",
};

const lineColors: Record<string, string> = {
  "red-600": "from-red-400 to-red-600 dark:from-red-500 dark:to-red-400",
  "blue-600": "from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-400",
  "amber-500": "from-amber-400 to-amber-500 dark:from-amber-500 dark:to-amber-400",
  "orange-500": "from-orange-400 to-orange-500 dark:from-orange-500 dark:to-orange-400",
  "emerald-600": "from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-400",
};

export function TimelineSteps({ steps, themeColor = "blue-600" }: TimelineStepsProps) {
  const circleGrad = circleGradients[themeColor] ?? circleGradients["blue-600"];
  const lineGrad = lineColors[themeColor] ?? lineColors["blue-600"];
  return (
    <div className="flex items-start gap-0 overflow-x-auto pb-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start">
          {/* Connector line (before, except first) */}
          {i > 0 && (
            <div className={`w-8 h-px mt-4 bg-gradient-to-r ${lineGrad} shrink-0`} />
          )}
          {/* Step */}
          <div className="flex flex-col items-center min-w-[120px] max-w-[160px]">
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${circleGrad} text-white text-xs font-bold flex items-center justify-center shadow-md shrink-0`}>
              {step.number || i + 1}
            </div>
            <div className="mt-2 text-center">
              <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 leading-tight">{step.action}</div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">{step.owner}</div>
              <div className="text-[10px] font-mono text-zinc-400 mt-0.5">{step.deadline}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
