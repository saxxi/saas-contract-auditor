"use client";

import { ReactNode } from "react";

interface AppLayoutProps {
  chatContent: ReactNode;
  appContent: ReactNode;
}

export function AppLayout({ chatContent, appContent }: AppLayoutProps) {
  return (
    <div className="h-full flex flex-row">
      {/* Left: Accounts area */}
      <div className="flex-1 h-full overflow-hidden">
        {appContent}
      </div>

      {/* Right: Chat (always visible) */}
      <div className="w-[380px] max-lg:hidden h-full overflow-y-auto border-l border-zinc-200 dark:border-zinc-700 px-4">
        {chatContent}
      </div>
    </div>
  );
}
