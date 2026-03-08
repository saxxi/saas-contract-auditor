"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAgent } from "@copilotkit/react-core/v2";
import dynamic from "next/dynamic";
import { Account, AccountSummary, Report } from "./types";
import { useUpdateReportContent } from "@/hooks/use-account-reports";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });
const ReportPreview = dynamic(
  () => import("./report-preview/report-preview").then((m) => ({ default: m.ReportPreview })),
  { ssr: false }
);

interface ReportModalProps {
  account: Account;
  report: Report;
  summary?: AccountSummary;
  onClose: () => void;
}

function MetricCard({ label, value, sub, alert }: { label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-0.5">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${alert ? "text-red-600" : ""}`}>{value}</span>
      {sub && <span className="text-[10px] text-zinc-400">{sub}</span>}
    </div>
  );
}

function utilPercent(used: number, limit: number): string {
  return `${Math.round((used / limit) * 100)}%`;
}

export function ReportModal({ account, report, summary, onClose }: ReportModalProps) {
  const { agent } = useAgent();
  const updateReport = useUpdateReportContent();
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const [content, setContent] = useState(report.content);
  const [mode, setMode] = useState<"preview" | "raw">("preview");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportIdRef = useRef(report.id);

  useEffect(() => {
    reportIdRef.current = report.id;
  }, [report.id]);

  useEffect(() => {
    setContent(report.content);
  }, [report.id, report.content]);

  const persistContent = useCallback(
    (md: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSaveStatus("idle");
      debounceRef.current = setTimeout(() => {
        setSaveStatus("saving");
        updateReport.mutate(
          { reportId: reportIdRef.current, content: md },
          {
            onSuccess: () => setSaveStatus("saved"),
            onError: () => setSaveStatus("idle"),
          }
        );
      }, 800);

      agent.setState({
        ...agent.state,
        report_manually_edited: true,
        report_latest_content: md,
      });
    },
    [updateReport, agent]
  );

  const handleRawChange = useCallback(
    (value: string | undefined) => {
      const md = value ?? "";
      setContent(md);
      persistContent(md);
    },
    [persistContent]
  );

  const handlePreviewChange = useCallback(
    (newMarkdown: string) => {
      setContent(newMarkdown);
      persistContent(newMarkdown);
    },
    [persistContent]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const renewalUrgent = summary ? summary.budget_report.renewal_in_days <= 30 : false;
  const paymentOverdue = summary?.budget_report.payment_status === "overdue";

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 rounded-lg" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-lg shadow-2xl w-[calc(100%-2rem)] max-h-[calc(100%-2rem)] flex flex-col border border-zinc-200 dark:border-zinc-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight">{account.name}</h2>
              <span className="text-xs text-zinc-400 font-mono">{account.id}</span>
            </div>
            <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-2">
              <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${
                report.proposition_type === "requires negotiation" ? "bg-red-600 text-white" :
                report.proposition_type === "upsell proposition" ? "bg-blue-600 text-white" :
                report.proposition_type === "poor usage" ? "bg-amber-500 text-white" :
                report.proposition_type === "at capacity" ? "bg-orange-500 text-white" :
                "bg-emerald-600 text-white"
              }`}>
                {report.proposition_type}
              </span>
              <span className={`text-xs font-semibold tabular-nums ${
                report.success_percent >= 70 ? "text-emerald-600" : report.success_percent >= 40 ? "text-amber-600" : "text-red-600"
              }`}>
                {report.success_percent}% success
              </span>
              {report.intervene && (
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
                  Action Required
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saveStatus === "saving" && <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Saving...</span>}
            {saveStatus === "saved" && <span className="text-[10px] text-emerald-500 uppercase tracking-wider">Saved</span>}
            <button
              onClick={() => setMode(mode === "raw" ? "preview" : "raw")}
              className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded cursor-pointer transition-colors ${
                mode === "raw"
                  ? "bg-blue-600 text-white"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {mode === "raw" ? "Preview" : "Raw Markdown"}
            </button>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg leading-none px-1 cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Metrics strip */}
        {summary && (
          <div className="flex items-center gap-6 px-6 py-2.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
            <MetricCard
              label="MRR"
              value={`$${summary.budget_report.mrr.toLocaleString()}`}
              sub={summary.budget_report.tier}
            />
            <MetricCard
              label="Renewal"
              value={`${summary.budget_report.renewal_in_days}d`}
              alert={renewalUrgent}
            />
            <MetricCard
              label="Payment"
              value={summary.budget_report.payment_status}
              alert={paymentOverdue}
            />
            <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-700" />
            <MetricCard
              label="Users"
              value={`${summary.active_users_report.active_users} / ${summary.active_users_report.seat_limit}`}
              sub={utilPercent(summary.active_users_report.active_users, summary.active_users_report.seat_limit)}
            />
            <MetricCard
              label="Invoices"
              value={`${summary.invoicing_usage_report.monthly_invoices} / ${summary.invoicing_usage_report.invoice_limit}`}
              sub={utilPercent(summary.invoicing_usage_report.monthly_invoices, summary.invoicing_usage_report.invoice_limit)}
            />
            <MetricCard
              label="Integrations"
              value={`${summary.integrations_usage_report.active_integrations} / ${summary.integrations_usage_report.integration_limit}`}
              sub={utilPercent(summary.integrations_usage_report.active_integrations, summary.integrations_usage_report.integration_limit)}
            />
            <div className="ml-auto text-[10px] text-zinc-400">
              Generated {new Date(report.generated_at).toLocaleDateString()}
            </div>
          </div>
        )}

        {/* Report content */}
        <div className={`flex-1 min-h-0 ${mode === "raw" ? "overflow-hidden" : "overflow-y-auto"}`} data-color-mode={isDark ? "dark" : "light"}>
          {mode === "raw" ? (
            <MDEditor
              value={content}
              onChange={handleRawChange}
              preview="live"
              height={500}
              visibleDragbar={false}
              style={{ height: "100%", border: "none", borderRadius: 0 }}
            />
          ) : (
            <ReportPreview
              content={content}
              propositionType={report.proposition_type}
              successPercent={report.success_percent}
              editable
              onContentChange={handlePreviewChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
