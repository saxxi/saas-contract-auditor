"use client";

import "./globals.css";

import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-core/v2/styles.css";
import { ThemeProvider } from "@/hooks/use-theme";
import { QueryProvider } from "@/lib/query-client";
import { Navbar } from "@/components/navbar";
import { ErrorBoundary } from "@/components/error-boundary";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>SaaS Contract Auditor</title>
        <meta name="description" content="Compare SaaS contract limits against real usage data. Identify upsell opportunities, renegotiation needs, and churn risks." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`antialiased flex flex-col h-full`}>
        <ThemeProvider>
          <QueryProvider>
            <CopilotKit runtimeUrl="/api/copilotkit">
              <Navbar />
              <div className="flex-1 overflow-hidden">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </div>
            </CopilotKit>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
