"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/hooks/use-theme";

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark =
    theme === "dark" ||
    (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <nav className="h-12 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
      <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
        Contract Auditor
      </Link>
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className={`text-xs uppercase tracking-wider transition-colors ${
            pathname === "/"
              ? "text-blue-600 dark:text-blue-400 font-semibold"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          Home
        </Link>
        <Link
          href="/demo"
          className={`text-xs uppercase tracking-wider transition-colors ${
            pathname === "/demo"
              ? "text-blue-600 dark:text-blue-400 font-semibold"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          Demo
        </Link>
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          aria-label="Toggle theme"
        >
          {mounted ? (isDark ? <SunIcon /> : <MoonIcon />) : <span className="w-4 h-4" />}
        </button>
      </div>
    </nav>
  );
}
