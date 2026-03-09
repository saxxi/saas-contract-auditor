"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LandingReportDialog } from "@/components/landing-report-dialog";
import { useAgent } from "@copilotkit/react-core/v2";
import { CopilotChat } from "@copilotkit/react-core/v2";
import {
  EXAMPLE_1,
  EXAMPLE_2,
  CACHED_NORTHSTAR_REPORT,
  CACHED_REPORTS,
  type CachedReport,
} from "@/lib/landing-data";

export default function HomePage() {
  const { agent } = useAgent();
  const [activeExample, setActiveExample] = useState<1 | 2>(1);
  const [textareaValue, setTextareaValue] = useState(EXAMPLE_1);
  const [reportData, setReportData] = useState<CachedReport | null>(CACHED_NORTHSTAR_REPORT);
  const [showDialog, setShowDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExampleSwitch = (example: 1 | 2) => {
    setActiveExample(example);
    setTextareaValue(example === 1 ? EXAMPLE_1 : EXAMPLE_2);
    setReportData(CACHED_REPORTS[example]);
    setShowDialog(false);
  };

  // Watch agent state for demo_report (syncing with external agent system)
  useEffect(() => {
    if (agent.state?.demo_report) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with external agent state
      setReportData(agent.state.demo_report);
      setShowDialog(true);
      setIsGenerating(false);
    }
  }, [agent.state?.demo_report]);

  // Reset generating state when agent stops
  useEffect(() => {
    if (!agent.isRunning && isGenerating && agent.state?.demo_report) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with external agent state
      setIsGenerating(false);
    }
  }, [agent.isRunning, isGenerating, agent.state?.demo_report]);

  const handleGenerate = () => {
    setIsGenerating(true);
    agent.setMessages([]);
    agent.addMessage({
      role: "user",
      id: crypto.randomUUID(),
      content: `Analyze this account data and generate a report:\n${textareaValue}`,
    });
    try {
      if (!agent.isRunning) agent.runAgent();
    } catch {
      setIsGenerating(false);
    }
  };

  const handleOpenReport = () => {
    setShowDialog(true);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Section 1: Hero */}
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">
          Are your SaaS clients still on the right contract?
        </h1>
        <p className="text-lg text-zinc-500 dark:text-zinc-400 mb-10 max-w-2xl">
          Compare contract limits with real usage across hundreds of accounts and identify where to upsell, renegotiate, or protect revenue.
        </p>

        {/* Section 2: Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 mb-12">
          {/* Column 1: CTA + example buttons + textarea */}
          <div className="flex flex-col gap-4">
            {/* Row 1: CTA */}
            <div>
              <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-2">
                See an example in action!
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                We&apos;ve pre-filled a sample account. Hit Generate to see the consulting-grade
                report our AI produces, or paste your own data.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-wait"
                >
                  {isGenerating ? "Generating..." : "Generate Report"}
                </button>
                {reportData && (
                  <button
                    onClick={handleOpenReport}
                    className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-semibold rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    Open Report
                  </button>
                )}
              </div>
            </div>

            {/* Row 2: Example buttons + textarea */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Account data
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExampleSwitch(1)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                      activeExample === 1
                        ? "border border-zinc-400 dark:border-zinc-500 text-zinc-800 dark:text-zinc-200"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                    }`}
                  >
                    Example 1
                  </button>
                  <button
                    onClick={() => handleExampleSwitch(2)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                      activeExample === 2
                        ? "border border-zinc-400 dark:border-zinc-500 text-zinc-800 dark:text-zinc-200"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                    }`}
                  >
                    Example 2
                  </button>
                </div>
              </div>
              <textarea
                value={textareaValue}
                onChange={(e) => { setTextareaValue(e.target.value); setReportData(null); setShowDialog(false); }}
                className="w-full flex-1 min-h-48 font-mono text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-zinc-700 dark:text-zinc-300"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Column 2: Chat */}
          <div className="min-h-[350px] max-h-[520px] overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg px-3">
            <CopilotChat />
          </div>
        </div>

        {/* Section 3: Secondary CTA */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-10 text-center">
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-2">
            Want to see the full experience?
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
            Explore multi-account analysis, opportunity finding, and interactive report editing.
          </p>
          <Link
            href="/demo"
            className="inline-block px-8 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            See the full demo &rarr;
          </Link>
        </div>
      </div>

      {/* Report dialog */}
      {reportData && showDialog && (
        <LandingReportDialog
          accountName="Report for selected company"
          report={reportData}
          onClose={() => setShowDialog(false)}
        />
      )}
    </div>
  );
}
