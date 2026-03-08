"use client";

import { useState, useCallback } from "react";
import Markdown from "react-markdown";
import type { PropositionType } from "../types";
import {
  parseReport,
  parseResolutionOptions,
  parseKeyMetrics,
  parseRisks,
  parseNextSteps,
  parseEvidence,
  replaceSectionBody,
  type ParsedSection,
} from "./parse-report";
import { reportThemes, type ReportTheme } from "./theme-config";
import { SectionHeader } from "./section-header";
import { UtilizationGauge } from "./utilization-gauge";
import { StatCard } from "./stat-card";
import { OptionCard } from "./option-card";
import { RiskMatrix } from "./risk-matrix";
import { TimelineSteps } from "./timeline-steps";
import { EvidenceCard } from "./evidence-card";
import { KeyQuestion } from "./key-question";
import { ActionCallout } from "./action-callout";
import { BarComparisonChart } from "./bar-comparison-chart";
import { CapacityRadial } from "./capacity-radial";
import { UsageTrendSpark } from "./usage-trend-spark";
import { EditableSection } from "./editable-section";

interface ReportPreviewProps {
  content: string;
  propositionType: PropositionType;
  successPercent: number;
  editable?: boolean;
  onContentChange?: (newMarkdown: string) => void;
}

const successBadgeColor = (pct: number) =>
  pct >= 70 ? "bg-emerald-500/20 text-emerald-100" : pct >= 40 ? "bg-amber-500/20 text-amber-100" : "bg-red-500/20 text-red-100";

export function ReportPreview({ content, propositionType, successPercent, editable, onContentChange }: ReportPreviewProps) {
  const theme = reportThemes[propositionType] ?? reportThemes.healthy;
  const { sections } = parseReport(content);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

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

  const utilizationMetrics = metrics.filter(
    (m) => m.utilization && m.utilization !== "--" && m.utilization.includes("%")
  );
  const statusMetrics = metrics.filter(
    (m) => !m.utilization || m.utilization === "--" || !m.utilization.includes("%")
  );

  const resolutionText = resolution?.body
    .split("\n")
    .filter((l) => !l.trim().startsWith("|") && l.trim().length > 0)
    .join(" ")
    .trim();

  const questionText = keyQuestion?.body
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .join(" ")
    .trim();

  // Section editing handlers
  const handleStartEdit = useCallback((sectionId: string) => {
    if (!editable) return;
    setEditingSectionId(sectionId);
  }, [editable]);

  const handleSave = useCallback((sectionId: string, newBody: string) => {
    const section = sections.find((s) => s.heading === sectionId || `exec-${s.heading}` === sectionId);
    if (section && onContentChange) {
      const updated = replaceSectionBody(content, section, newBody);
      onContentChange(updated);
    }
    setEditingSectionId(null);
  }, [sections, content, onContentChange]);

  const handleCancel = useCallback(() => {
    setEditingSectionId(null);
  }, []);

  // Wrap content in editable section if editing is enabled
  const wrapEditable = (sectionId: string, section: ParsedSection | undefined, children: React.ReactNode) => {
    if (!editable || !section) return children;
    return (
      <EditableSection
        sectionId={sectionId}
        sectionBody={section.body}
        editingSectionId={editingSectionId}
        onStartEdit={handleStartEdit}
        onSave={handleSave}
        onCancel={handleCancel}
      >
        {children}
      </EditableSection>
    );
  };

  // Hero chart for Key Metrics based on theme
  const renderHeroChart = () => {
    if (metrics.length === 0) return null;
    switch (theme.heroChart) {
      case "bar-comparison":
        return <BarComparisonChart metrics={metrics} color={theme.primary} />;
      case "capacity-radial":
        return <CapacityRadial metrics={metrics} />;
      case "usage-trend":
        return <UsageTrendSpark metrics={metrics} />;
      case "stat-cards":
      default:
        return null; // stat-cards mode uses default gauges + cards below
    }
  };

  // Build section renderers keyed by section order slug
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    "executive-summary": () =>
      (situation || complication) ? (
        <div key="exec-summary">
          {wrapEditable("exec-situation", situation, (
            <div>
              <SectionHeader title="Executive Summary" themeColor={theme.accent} />
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
          ))}
        </div>
      ) : null,

    "action-callout": () =>
      theme.actionCallout ? (
        <div key="action-callout">
          <ActionCallout theme={theme} metrics={metrics} />
        </div>
      ) : null,

    resolution: () =>
      resolutionOptions.length > 0 ? (
        <div key="resolution">
          {wrapEditable(resolution!.heading, resolution, (
            <div>
              <SectionHeader title="Resolution" themeColor={theme.accent} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resolutionOptions.map((opt, i) => (
                  <OptionCard
                    key={i}
                    option={opt}
                    label={`Option ${String.fromCharCode(65 + i)}`}
                    recommended={i === 0}
                    themeColor={theme.primary}
                  />
                ))}
              </div>
              {resolutionText && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-3 italic font-serif">{resolutionText}</p>
              )}
            </div>
          ))}
        </div>
      ) : null,

    metrics: () =>
      metrics.length > 0 ? (
        <div key="metrics">
          {wrapEditable(keyMetrics!.heading, keyMetrics, (
            <div>
              <SectionHeader title="Key Metrics" themeColor={theme.accent} />
              {/* Hero chart */}
              {renderHeroChart()}
              <div className="flex flex-wrap items-start gap-6 mt-4">
                {/* Utilization gauges (shown for stat-cards mode or as supplement) */}
                {(theme.heroChart === "stat-cards" || theme.heroChart === "bar-comparison") && utilizationMetrics.length > 0 && (
                  <div className="flex gap-4">
                    {utilizationMetrics.map((m, i) => {
                      const numVal = parseFloat(m.value.replace(/[^0-9.]/g, "")) || 0;
                      const numLimit = parseFloat(m.limit.replace(/[^0-9.]/g, "")) || 100;
                      return <UtilizationGauge key={i} value={numVal} max={numLimit} label={m.metric} />;
                    })}
                  </div>
                )}
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
          ))}
        </div>
      ) : null,

    evidence: () =>
      evidenceItems.length > 0 ? (
        <div key="evidence">
          {wrapEditable(evidence!.heading, evidence, (
            <div>
              <SectionHeader title="Evidence from Similar Engagements" themeColor={theme.accent} />
              <div className="space-y-2">
                {evidenceItems.map((item, i) => (
                  <EvidenceCard key={i} item={item} themeColor={theme.accent} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null,

    risks: () =>
      riskRows.length > 0 ? (
        <div key="risks">
          {wrapEditable(risks!.heading, risks, (
            <div>
              <SectionHeader title="Risks & Mitigants" themeColor={theme.accent} />
              <RiskMatrix risks={riskRows} bold={propositionType === "requires negotiation"} />
            </div>
          ))}
        </div>
      ) : null,

    "next-steps": () =>
      steps.length > 0 ? (
        <div key="next-steps">
          {wrapEditable(nextSteps!.heading, nextSteps, (
            <div>
              <SectionHeader title="Next Steps" themeColor={theme.accent} />
              <TimelineSteps steps={steps} themeColor={theme.primary} />
            </div>
          ))}
        </div>
      ) : null,

    "key-question": () =>
      questionText ? (
        <div key="key-question">
          {wrapEditable(keyQuestion!.heading, keyQuestion, (
            <div>
              <SectionHeader title="Key Question" themeColor={theme.accent} />
              <KeyQuestion text={questionText} themeColor={theme.accent} />
            </div>
          ))}
        </div>
      ) : null,
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {/* Proposition Banner */}
        <div className={`bg-gradient-to-r ${theme.bannerGradient} rounded-xl px-6 py-4 flex items-center justify-between shadow-lg`}>
          <span className="text-white font-semibold uppercase tracking-wider text-sm">
            {propositionType}
          </span>
          <span className={`text-xs font-bold tabular-nums px-2.5 py-1 rounded-full ${successBadgeColor(successPercent)}`}>
            {successPercent}% success likelihood
          </span>
        </div>

        {/* Render sections in theme-defined order */}
        {theme.sectionOrder.map((slug) => {
          const renderer = sectionRenderers[slug];
          return renderer ? renderer() : null;
        })}

        {/* Fallback: unknown sections rendered as markdown */}
        {unknownSections.map((s, i) => (
          <div key={`unknown-${i}`}>
            {wrapEditable(s.heading, s, (
              <div>
                <SectionHeader title={s.heading} themeColor={theme.accent} />
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <Markdown>{s.body}</Markdown>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
