"use client";

import { AppLayout } from "@/components/app-layout";
import { ContractsCanvas } from "@/components/contracts/contracts-canvas";

import { CopilotChat } from "@copilotkit/react-core/v2";

export default function DemoPage() {
  return (
    <AppLayout
      chatContent={<CopilotChat />}
      appContent={<ContractsCanvas />}
    />
  );
}
