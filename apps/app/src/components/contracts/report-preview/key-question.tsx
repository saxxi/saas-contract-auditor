interface KeyQuestionProps {
  text: string;
}

export function KeyQuestion({ text }: KeyQuestionProps) {
  return (
    <div className="relative bg-zinc-50 dark:bg-zinc-800/40 border-l-4 border-amber-500 dark:border-amber-400 rounded-r-lg px-6 py-5">
      <div className="absolute top-2 left-3 text-4xl text-amber-300/40 dark:text-amber-500/20 font-serif leading-none select-none">
        &ldquo;
      </div>
      <p className="text-base text-zinc-800 dark:text-zinc-200 italic font-serif leading-relaxed pl-4">
        {text}
      </p>
    </div>
  );
}
