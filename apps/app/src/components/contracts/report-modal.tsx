"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Account, AccountSummary, Report } from "./types";
import { useUpdateReportContent } from "@/hooks/use-account-reports";

interface ReportModalProps {
  account: Account;
  report: Report;
  summary?: AccountSummary;
  onClose: () => void;
  onRegenerate: (id: string) => void;
  isRegenerating?: boolean;
}

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  const btn = (active: boolean) =>
    `px-2 py-1 rounded text-xs font-medium transition-colors ${
      active
        ? "bg-zinc-200 dark:bg-zinc-600 text-zinc-900 dark:text-zinc-100"
        : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
    }`;

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-200 dark:border-zinc-700">
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))}>
        B
      </button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))}>
        I
      </button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive("heading", { level: 3 }))}>
        H3
      </button>
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive("bulletList"))}>
        List
      </button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive("orderedList"))}>
        1.
      </button>
    </div>
  );
}

export function ReportModal({ account, report, summary, onClose, onRegenerate, isRegenerating }: ReportModalProps) {
  const updateReport = useUpdateReportContent();
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportIdRef = useRef(report.id);

  useEffect(() => {
    reportIdRef.current = report.id;
  }, [report.id]);

  const handleContentUpdate = useCallback(
    (html: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSaveStatus("idle");
      debounceRef.current = setTimeout(() => {
        setSaveStatus("saving");
        updateReport.mutate(
          { reportId: reportIdRef.current, content: html },
          {
            onSuccess: () => setSaveStatus("saved"),
            onError: () => setSaveStatus("idle"),
          }
        );
      }, 800);
    },
    [updateReport]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: report.content.includes("<") ? report.content : `<p>${report.content}</p>`,
    onUpdate: ({ editor }) => {
      handleContentUpdate(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-3",
      },
    },
  });

  // Reset editor content when report changes (e.g. after regeneration)
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const newContent = report.content.includes("<") ? report.content : `<p>${report.content}</p>`;
      if (editor.getHTML() !== newContent) {
        editor.commands.setContent(newContent);
      }
    }
  }, [report.id, report.content, editor]);

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 rounded-lg" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-[calc(100%-2rem)] max-h-[calc(100%-2rem)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <div>
            <h2 className="text-lg font-semibold">{account.name}</h2>
            <span className="text-sm text-zinc-500">
              {account.id}{summary ? ` \u00b7 ${summary.budget_report.tier}` : ""}
              {" \u00b7 "}Generated {new Date(report.generated_at).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {saveStatus === "saving" && <span className="text-xs text-zinc-400">Saving...</span>}
            {saveStatus === "saved" && <span className="text-xs text-green-500">Saved</span>}
            <button
              onClick={() => onRegenerate(account.id)}
              disabled={isRegenerating}
              className="text-xs px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRegenerating ? "Regenerating..." : "Regenerate"}
            </button>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-2xl leading-none px-2"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Left: Report content */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="px-6 pt-4 pb-2">
              <div className="flex items-center gap-3">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  report.proposition_type === "requires negotiation" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" :
                  report.proposition_type === "upsell proposition" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" :
                  report.proposition_type === "poor usage" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" :
                  report.proposition_type === "at capacity" ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" :
                  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                }`}>
                  {report.proposition_type}
                </span>
                <span className="text-sm text-zinc-500">
                  Success: <strong className={report.success_percent >= 70 ? "text-green-600" : report.success_percent >= 40 ? "text-amber-600" : "text-red-600"}>
                    {report.success_percent}%
                  </strong>
                </span>
                {report.intervene && (
                  <span className="text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">
                    INTERVENTION NEEDED
                  </span>
                )}
              </div>
            </div>

            <div className="mx-6 mb-4 flex-1 min-h-0 flex flex-col border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
              <EditorToolbar editor={editor} />
              <div className="flex-1 min-h-0 overflow-y-auto">
                <EditorContent editor={editor} />
              </div>
            </div>

            {summary && (
              <div className="px-6 pb-4">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                    <div className="text-zinc-500 text-xs mb-1">Users</div>
                    <div className="font-semibold">{summary.active_users_report.active_users} / {summary.active_users_report.seat_limit}</div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                    <div className="text-zinc-500 text-xs mb-1">Invoices</div>
                    <div className="font-semibold">{summary.invoicing_usage_report.monthly_invoices} / {summary.invoicing_usage_report.invoice_limit}</div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                    <div className="text-zinc-500 text-xs mb-1">Integrations</div>
                    <div className="font-semibold">{summary.integrations_usage_report.active_integrations} / {summary.integrations_usage_report.integration_limit}</div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                    <div className="text-zinc-500 text-xs mb-1">MRR</div>
                    <div className="font-semibold">${summary.budget_report.mrr.toLocaleString()}</div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                    <div className="text-zinc-500 text-xs mb-1">Renewal</div>
                    <div className={`font-semibold ${summary.budget_report.renewal_in_days <= 30 ? "text-red-600" : ""}`}>
                      {summary.budget_report.renewal_in_days} days
                    </div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                    <div className="text-zinc-500 text-xs mb-1">Payment</div>
                    <div className={`font-semibold ${summary.budget_report.payment_status === "overdue" ? "text-red-600" : "text-green-600"}`}>
                      {summary.budget_report.payment_status}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
