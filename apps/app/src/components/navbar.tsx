"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();

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
      </div>
    </nav>
  );
}
