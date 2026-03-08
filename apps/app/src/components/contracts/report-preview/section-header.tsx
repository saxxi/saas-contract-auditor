const accentMap: Record<string, string> = {
  "red-600": "border-red-300 dark:border-red-700",
  "red-500": "border-red-300 dark:border-red-700",
  "blue-600": "border-blue-300 dark:border-blue-700",
  "blue-500": "border-blue-300 dark:border-blue-700",
  "amber-500": "border-amber-300 dark:border-amber-700",
  "orange-500": "border-orange-300 dark:border-orange-700",
  "emerald-600": "border-emerald-300 dark:border-emerald-700",
  "emerald-500": "border-emerald-300 dark:border-emerald-700",
};

interface SectionHeaderProps {
  title: string;
  accent?: string;
  themeColor?: string;
}

export function SectionHeader({ title, accent, themeColor }: SectionHeaderProps) {
  const resolvedAccent = accent ?? (themeColor ? accentMap[themeColor] : undefined) ?? "border-zinc-300 dark:border-zinc-600";
  return (
    <div className="flex items-center gap-3 mb-4 mt-8 first:mt-0">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 whitespace-nowrap font-serif">
        {title}
      </h3>
      <div className={`flex-1 h-px ${resolvedAccent}`} style={{ borderBottomWidth: 1, borderBottomStyle: "solid" }} />
    </div>
  );
}
