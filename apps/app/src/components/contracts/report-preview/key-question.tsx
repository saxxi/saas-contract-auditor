interface KeyQuestionProps {
  text: string;
  themeColor?: string;
}

const questionBorders: Record<string, string> = {
  "red-600": "border-red-500 dark:border-red-400",
  "blue-600": "border-blue-500 dark:border-blue-400",
  "amber-500": "border-amber-500 dark:border-amber-400",
  "orange-500": "border-orange-500 dark:border-orange-400",
  "emerald-600": "border-emerald-500 dark:border-emerald-400",
};

const quoteColors: Record<string, string> = {
  "red-600": "text-red-300/40 dark:text-red-500/20",
  "blue-600": "text-blue-300/40 dark:text-blue-500/20",
  "amber-500": "text-amber-300/40 dark:text-amber-500/20",
  "orange-500": "text-orange-300/40 dark:text-orange-500/20",
  "emerald-600": "text-emerald-300/40 dark:text-emerald-500/20",
};

export function KeyQuestion({ text, themeColor = "amber-500" }: KeyQuestionProps) {
  return (
    <div className={`relative bg-zinc-50 dark:bg-zinc-800/40 ${questionBorders[themeColor] ?? "border-amber-500 dark:border-amber-400"} border-l-4 rounded-r-lg px-6 py-5`}>
      <div className={`absolute top-2 left-3 text-4xl ${quoteColors[themeColor] ?? "text-amber-300/40 dark:text-amber-500/20"} font-serif leading-none select-none`}>
        &ldquo;
      </div>
      <p className="text-base text-zinc-800 dark:text-zinc-200 italic font-serif leading-relaxed pl-4">
        {text}
      </p>
    </div>
  );
}
