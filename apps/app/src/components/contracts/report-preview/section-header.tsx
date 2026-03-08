interface SectionHeaderProps {
  title: string;
  accent?: string;
}

export function SectionHeader({ title, accent = "border-zinc-300 dark:border-zinc-600" }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-8 first:mt-0">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 whitespace-nowrap font-serif">
        {title}
      </h3>
      <div className={`flex-1 h-px ${accent}`} style={{ borderBottomWidth: 1, borderBottomStyle: "solid" }} />
    </div>
  );
}
