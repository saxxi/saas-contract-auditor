interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
}

export function StatCard({ label, value, sub, alert }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 min-w-[120px]">
      <div className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${alert ? "text-red-600" : "text-zinc-900 dark:text-zinc-100"}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-zinc-400 mt-0.5">{sub}</div>}
    </div>
  );
}
