import type { EvidenceItem } from "./parse-report";

interface EvidenceCardProps {
  item: EvidenceItem;
}

export function EvidenceCard({ item }: EvidenceCardProps) {
  // Split at first period to separate "what happened" from "what it means"
  const dotIndex = item.text.indexOf(". ");
  const happened = dotIndex >= 0 ? item.text.slice(0, dotIndex + 1) : item.text;
  const means = dotIndex >= 0 ? item.text.slice(dotIndex + 2) : "";

  return (
    <div className="border-l-3 border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10 rounded-r-lg px-4 py-3">
      <div className="flex items-start gap-2">
        {item.dealId && (
          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5">
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
