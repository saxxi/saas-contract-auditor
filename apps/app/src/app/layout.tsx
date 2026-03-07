"use client";

import "./globals.css";

import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-core/v2/styles.css";
import { ThemeProvider } from "@/hooks/use-theme";
import { QueryProvider } from "@/lib/query-client";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        <ThemeProvider>
          <QueryProvider>
            <CopilotKit runtimeUrl="/api/copilotkit">{children}</CopilotKit>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
