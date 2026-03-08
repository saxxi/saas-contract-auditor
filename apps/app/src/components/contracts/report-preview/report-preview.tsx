"use client";

import Markdown from "react-markdown";
import type { PropositionType } from "../types";
import {
  parseReport,
  parseResolutionOptions,
  parseKeyMetrics,
  parseRisks,
  parseNextSteps,
  parseEvidence,
} from "./parse-report";
import { SectionHeader } from "./section-header";
import { UtilizationGauge } from "./utilization-gauge";
import { StatCard } from "./stat-card";
import { OptionCard } from "./option-card";
import { RiskMatrix } from "./risk-matrix";
import { TimelineSteps } from "./timeline-steps";
import { EvidenceCard } from "./evidence-card";
import { KeyQuestion } from "./key-question";

interface ReportPreviewProps {
  content: string;
  propositionType: PropositionType;
  successPercent: number;
}

const bannerStyles: Record<PropositionType, string> = {
  "requires negotiation": "from-red-600 to-red-700",
  "upsell proposition": "from-blue-600 to-blue-700",
  "poor usage": "from-amber-500 to-amber-600",
  "at capacity": "from-orange-500 to-orange-600",
  healthy: "from-emerald-600 to-emerald-700",
};

const successBadgeColor = (pct: number) =>
  pct >= 70 ? "bg-emerald-500/20 text-emerald-100" : pct >= 40 ? "bg-amber-500/20 text-amber-100" : "bg-red-500/20 text-red-100";

export function ReportPreview({ content, propositionType, successPercent }: ReportPreviewProps) {
  const { sections } = parseReport(content);

  const findSection = (name: string) =>
    sections.find((s) => s.heading.toLowerCase().includes(name.toLowerCase()));

  const situation = findSection("situation");
  const complication = findSection("complication");
  const resolution = findSection("resolution");
  const keyMetrics = findSection("key metrics");
  const evidence = findSection("evidence");
  const risks = findSection("risk");
  const nextSteps = findSection("next steps");
  const keyQuestion = findSection("key question");

  // Collect any sections not matched above for fallback rendering
  const knownHeadings = new Set(
    [situation, complication, resolution, keyMetrics, evidence, risks, nextSteps, keyQuestion]
      .filter(Boolean)
      .map((s) => s!.heading)
  );
  const unknownSections = sections.filter(
    (s) => s.heading && !knownHeadings.has(s.heading)
  );

  // Parse structured data
  const resolutionOptions = resolution?.table ? parseResolutionOptions(resolution.table) : [];
  const metrics = keyMetrics?.table ? parseKeyMetrics(keyMetrics.table) : [];
  const riskRows = risks?.table ? parseRisks(risks.table) : [];
  const steps = nextSteps?.table ? parseNextSteps(nextSteps.table) : [];
  const evidenceItems = evidence ? parseEvidence(evidence.body) : [];

  // Separate utilization metrics (have numeric utilization) from financial/status metrics
  const utilizationMetrics = metrics.filter(
    (m) => m.utilization && m.utilization !== "--" && m.utilization.includes("%")
  );
  const statusMetrics = metrics.filter(
    (m) => !m.utilization || m.utilization === "--" || !m.utilization.includes("%")
  );

  // Extract recommendation text (non-table text in resolution)
  const resolutionText = resolution?.body
    .split("\n")
    .filter((l) => !l.trim().startsWith("|") && l.trim().length > 0)
    .join(" ")
    .trim();

  // Key question: strip heading, get body text
  const questionText = keyQuestion?.body
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .join(" ")
    .trim();

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {/* Proposition Banner */}
        <div className={`bg-gradient-to-r ${bannerStyles[propositionType] ?? bannerStyles.healthy} rounded-xl px-6 py-4 flex items-center justify-between shadow-lg`}>
          <span className="text-white font-semibold uppercase tracking-wider text-sm">
            {propositionType}
          </span>
          <span className={`text-xs font-bold tabular-nums px-2.5 py-1 rounded-full ${successBadgeColor(successPercent)}`}>
            {successPercent}% success likelihood
          </span>
        </div>

        {/* Executive Summary: Situation + Complication */}
        {(situation || complication) && (
          <div>
            <SectionHeader title="Executive Summary" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {situation && (
                <div className="border-l-2 border-zinc-300 dark:border-zinc-600 pl-4">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1.5">Situation</div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-serif">{situation.body}</p>
                </div>
              )}
              {complication && (
                <div className="border-l-2 border-red-400 dark:border-red-500 pl-4">
                  <div className="text-[10px] uppercase tracking-wider text-red-500 dark:text-red-400 mb-1.5">Complication</div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-serif">{complication.body}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resolution Options */}
        {resolutionOptions.length > 0 && (
          <div>
            <SectionHeader title="Resolution" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resolutionOptions.map((opt, i) => (
                <OptionCard
                  key={i}
                  option={opt}
                  label={`Option ${String.fromCharCode(65 + i)}`}
                  recommended={i === 0}
                />
              ))}
            </div>
            {resolutionText && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-3 italic font-serif">{resolutionText}</p>
            )}
          </div>
        )}

        {/* Key Metrics */}
        {metrics.length > 0 && (
          <div>
            <SectionHeader title="Key Metrics" />
            <div className="flex flex-wrap items-start gap-6">
              {/* Utilization gauges */}
              {utilizationMetrics.length > 0 && (
                <div className="flex gap-4">
                  {utilizationMetrics.map((m, i) => {
                    const numVal = parseFloat(m.value.replace(/[^0-9.]/g, "")) || 0;
                    const numLimit = parseFloat(m.limit.replace(/[^0-9.]/g, "")) || 100;
                    return (
                      <UtilizationGauge key={i} value={numVal} max={numLimit} label={m.metric} />
                    );
                  })}
                </div>
              )}
              {/* Financial/status stat cards */}
              {statusMetrics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {statusMetrics.map((m, i) => (
                    <StatCard
                      key={i}
                      label={m.metric}
                      value={m.value}
                      sub={m.limit !== "--" ? `Limit: ${m.limit}` : undefined}
                      alert={m.metric.toLowerCase().includes("payment") && m.value.toLowerCase() === "overdue"}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Evidence */}
        {evidenceItems.length > 0 && (
          <div>
            <SectionHeader title="Evidence from Similar Engagements" />
            <div className="space-y-2">
              {evidenceItems.map((item, i) => (
                <EvidenceCard key={i} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* Risks */}
        {riskRows.length > 0 && (
          <div>
            <SectionHeader title="Risks & Mitigants" />
            <RiskMatrix risks={riskRows} />
          </div>
        )}

        {/* Next Steps */}
        {steps.length > 0 && (
          <div>
            <SectionHeader title="Next Steps" />
            <TimelineSteps steps={steps} />
          </div>
        )}

        {/* Key Question */}
        {questionText && (
          <div>
            <SectionHeader title="Key Question" />
            <KeyQuestion text={questionText} />
          </div>
        )}

        {/* Fallback: unknown sections rendered as markdown */}
        {unknownSections.map((s, i) => (
          <div key={i}>
            <SectionHeader title={s.heading} />
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <Markdown>{s.body}</Markdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
