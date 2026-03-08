import type { NextStep } from "./parse-report";

interface TimelineStepsProps {
  steps: NextStep[];
}

export function TimelineSteps({ steps }: TimelineStepsProps) {
  return (
    <div className="flex items-start gap-0 overflow-x-auto pb-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start">
          {/* Connector line (before, except first) */}
          {i > 0 && (
            <div className="w-8 h-px mt-4 bg-gradient-to-r from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-400 shrink-0" />
          )}
          {/* Step */}
          <div className="flex flex-col items-center min-w-[120px] max-w-[160px]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white text-xs font-bold flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
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
