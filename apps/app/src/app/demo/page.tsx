"use client";

import { AppLayout } from "@/components/app-layout";
import { ContractsCanvas } from "@/components/contracts/contracts-canvas";
import { ErrorBoundary } from "@/components/error-boundary";

import { CopilotChat } from "@copilotkit/react-core/v2";

export default function DemoPage() {
  return (
    <AppLayout
      chatContent={
        <ErrorBoundary>
          <CopilotChat />
        </ErrorBoundary>
      }
      appContent={
        <ErrorBoundary>
          <ContractsCanvas />
        </ErrorBoundary>
      }
    />
  );
}
