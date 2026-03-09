"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { PropositionType } from "./contracts/types";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });
const ReportPreview = dynamic(
  () => import("./contracts/report-preview/report-preview").then((m) => ({ default: m.ReportPreview })),
  { ssr: false }
);

interface LandingReportData {
  content: string;
  proposition_type: PropositionType;
  success_percent: number;
  intervene: boolean;
}

interface LandingReportDialogProps {
  accountName: string;
  report: LandingReportData;
  onClose: () => void;
}

export function LandingReportDialog({ accountName, report, onClose }: LandingReportDialogProps) {
  const [content, setContent] = useState(report.content);
  const [mode, setMode] = useState<"preview" | "raw">("preview");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const [isDark, setIsDark] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing local editor state with prop changes
    setContent(report.content);
  }, [report.content]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Fake save: simulates saving with a short delay
  const fakeSave = useCallback((md: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveStatus("idle");
    debounceRef.current = setTimeout(() => {
      setSaveStatus("saving");
      setTimeout(() => setSaveStatus("saved"), 400);
    }, 800);
    void md; // content tracked in state
  }, []);

  const handleRawChange = useCallback(
    (value: string | undefined) => {
      const md = value ?? "";
      setContent(md);
      fakeSave(md);
    },
    [fakeSave]
  );

  const handlePreviewChange = useCallback(
    (newMarkdown: string) => {
      setContent(newMarkdown);
      fakeSave(newMarkdown);
    },
    [fakeSave]
  );

  const handlePrint = useCallback(() => {
    const source = document.querySelector("[data-report-print]");
    if (!source) return;
    const clone = source.cloneNode(true) as HTMLElement;
    clone.id = "print-wrapper";
    clone.removeAttribute("data-report-print");
    document.body.appendChild(clone);
    document.body.classList.add("printing");
    window.print();
    document.body.classList.remove("printing");
    clone.remove();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-lg shadow-2xl w-[calc(100%-4rem)] max-w-5xl max-h-[calc(100%-4rem)] flex flex-col border border-zinc-200 dark:border-zinc-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight">{accountName}</h2>
              <span className="text-xs text-zinc-400 font-mono">Demo preview</span>
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
            {saveStatus === "saved" && <span className="text-[10px] text-emerald-500 uppercase tracking-wider">Saved (demo)</span>}
            <button
              onClick={handlePrint}
              className="text-[10px] uppercase tracking-wider px-2 py-1 rounded cursor-pointer text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Print / Save as PDF"
            >
              PDF
            </button>
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

        {/* Report content */}
        <div className={`flex-1 min-h-0 ${mode === "raw" ? "overflow-hidden" : "overflow-y-auto"}`} data-color-mode={isDark ? "dark" : "light"} data-report-print>
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
