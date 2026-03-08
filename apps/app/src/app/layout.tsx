"use client";

import "./globals.css";

import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-core/v2/styles.css";
import { ThemeProvider } from "@/hooks/use-theme";
import { QueryProvider } from "@/lib/query-client";
import { Navbar } from "@/components/navbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased flex flex-col h-full`}>
        <ThemeProvider>
          <QueryProvider>
            <CopilotKit runtimeUrl="/api/copilotkit">
              <Navbar />
              <div className="flex-1 overflow-hidden">
                {children}
              </div>
            </CopilotKit>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
